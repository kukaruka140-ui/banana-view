import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { randomUUID } from "crypto";
import "dotenv/config";

import { RoomManager } from "./RoomManager.js";
import { buildVideoPayload } from "./videoUtils.js";
import driveProxy from "./driveProxy.js";
import { telegramAuthMiddleware, verifyTelegramInitData } from "./telegramAuth.js";

const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN || null;
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS) || 6 * 60 * 60 * 1000;

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

const roomManager = new RoomManager({ ttlMs: ROOM_TTL_MS });

// --- REST endpoints ---

app.get("/api/health", (req, res) => {
  res.json({ ok: true, ...roomManager.stats() });
});

// Google Drive video proxy (підтримує Range для seek)
app.use("/api", driveProxy);

/**
 * POST /api/auth/telegram
 * Перевіряє initData з Mini App, повертає дані юзера + start_param
 * (room code, якщо юзер прийшов по deep-link з бота).
 */
app.post("/api/auth/telegram", (req, res) => {
  const { initData } = req.body || {};

  if (!BOT_TOKEN) {
    return res.status(200).json({
      ok: true,
      verified: false,
      note: "BOT_TOKEN не налаштований на сервері - авторизація пропущена",
      user: null,
      startParam: null,
    });
  }

  const result = verifyTelegramInitData(initData, BOT_TOKEN);
  if (!result.ok) {
    return res.status(401).json({ ok: false, error: result.reason });
  }

  res.json({
    ok: true,
    verified: true,
    user: result.user,
    startParam: result.startParam,
  });
});

/**
 * POST /api/rooms
 * Створює нову кімнату. Повертає код кімнати.
 * Тіло запиту: { name, avatarUrl, userId }
 */
app.use("/api/rooms", telegramAuthMiddleware(BOT_TOKEN));

app.post("/api/rooms", (req, res) => {
  const { name, avatarUrl, userId } = req.body || {};

  const hostName = name || req.telegramUser?.first_name || "Хост";
  const hostUserId = userId || req.telegramUser?.id?.toString() || `guest-${Date.now()}`;
  const hostAvatar = avatarUrl || null;

  // socketId буде встановлений пізніше, коли клієнт підключиться по Socket.io
  // тут ми лише резервуємо код кімнати
  const room = roomManager.createRoom({
    socketId: `pending-${hostUserId}`,
    userId: hostUserId,
    name: hostName,
    avatarUrl: hostAvatar,
  });

  res.json({ ok: true, code: room.code });
});

/**
 * GET /api/rooms/:code
 * Перевіряє, чи існує кімната (для валідації коду перед join).
 */
app.get("/api/rooms/:code", (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ ok: false, error: "Кімната не знайдена" });
  }
  res.json({ ok: true, code: room.code, memberCount: room.members.size, video: room.video });
});

// --- HTTP + Socket.io ---

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

/**
 * Socket.io події:
 *
 * Клієнт -> Сервер:
 *  - "room:join"      { code, name, avatarUrl, userId }
 *  - "video:set"      { url, title }                (тільки хост)
 *  - "playback:sync"  { currentTime, isPlaying }     (тільки хост)
 *  - "playback:request_sync"  {}                     (будь-хто, просить актуальний стан)
 *  - "chat:message"   { text, replyTo }
 *  - "chat:react"     { messageId, emoji }
 *  - "reaction:send"  { emoji }
 *  - "playlist:add"   { url, title }
 *  - "playlist:next"  {}                             (тільки хост)
 *
 * Сервер -> Клієнт:
 *  - "room:state"     повний snapshot кімнати (room.toJSON())
 *  - "room:members"   оновлений список учасників
 *  - "video:changed"  { video }
 *  - "playback:update"  { currentTime, isPlaying, updatedAt }
 *  - "chat:message"   { id, from, text, ts, replyTo, reactions }
 *  - "chat:reaction_update"  { messageId, reactions }
 *  - "reaction:broadcast"  { from, emoji }
 *  - "playlist:updated"  { playlist }
 *  - "error"          { message }
 */
io.on("connection", (socket) => {
  socket.on("room:join", ({ code, name, avatarUrl, userId }) => {
    if (!code || typeof code !== "string") {
      socket.emit("error", { message: "Код кімнати обов'язковий" });
      return;
    }

    let room = roomManager.getRoom(code);

    // Якщо кімната була "зарезервована" через POST /api/rooms (pending host),
    // і це перший справжній socket-учасник з тим самим userId - заповнюємо
    // його реальний socketId замість pending-заглушки.
    if (room) {
      for (const [socketId, member] of room.members.entries()) {
        if (socketId.startsWith("pending-") && member.userId === userId) {
          room.members.delete(socketId);
          break;
        }
      }
    }

    if (!room) {
      socket.emit("error", { message: "Кімната не знайдена" });
      return;
    }

    const resolvedUserId = userId || `guest-${socket.id}`;
    const resolvedName = name || "Гість";

    room = roomManager.joinRoom(code, {
      socketId: socket.id,
      userId: resolvedUserId,
      name: resolvedName,
      avatarUrl: avatarUrl || null,
    });

    socket.join(code);
    socket.data.roomCode = code;

    socket.emit("room:state", room.toJSON());
    io.to(code).emit("room:members", room.toJSON().members);

    socket.to(code).emit("chat:message", {
      from: { name: resolvedName, system: true },
      text: `${resolvedName} приєднався до перегляду`,
      ts: Date.now(),
      system: true,
    });
  });

  /**
   * Хост встановлює нове відео для кімнати.
   */
  socket.on("video:set", ({ url, title }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member?.isHost) {
      socket.emit("error", { message: "Лише хост може змінювати відео" });
      return;
    }

    const payload = buildVideoPayload(url, title);
    if (payload.error) {
      socket.emit("error", { message: payload.error });
      return;
    }

    room.setVideo(payload.video);
    io.to(room.code).emit("video:changed", { video: room.video });
    io.to(room.code).emit("playback:update", {
      currentTime: 0,
      isPlaying: false,
      updatedAt: room.playback.updatedAt,
    });
  });

  /**
   * Хост синхронізує play/pause/seek для всіх.
   */
  socket.on("playback:sync", ({ currentTime, isPlaying }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member?.isHost) {
      // Не-хост не може керувати плеєром глобально - просто ігноруємо
      return;
    }

    if (typeof currentTime !== "number" || typeof isPlaying !== "boolean") {
      return;
    }

    room.setPlayback({ currentTime, isPlaying });

    socket.to(room.code).emit("playback:update", {
      currentTime: room.playback.currentTime,
      isPlaying: room.playback.isPlaying,
      updatedAt: room.playback.updatedAt,
    });
  });

  /**
   * Будь-хто може запросити поточний стан плеєра
   * (наприклад, при відновленні з'єднання).
   */
  socket.on("playback:request_sync", () => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    socket.emit("playback:update", {
      currentTime: room.getCurrentTime(),
      isPlaying: room.playback.isPlaying,
      updatedAt: room.playback.updatedAt,
    });
  });

  /**
   * Текстовий чат. Підтримує reply через поле replyTo: { messageId }.
   * Сервер сам підставляє текст і автора оригінального повідомлення
   * (клієнт надсилає лише messageId, на яке відповідає).
   */
  socket.on("chat:message", ({ text, replyTo }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member) return;

    const trimmed = (text || "").toString().trim().slice(0, 500);
    if (!trimmed) return;

    let replyPayload = null;
    if (replyTo?.messageId) {
      const original = room.findChatMessage(replyTo.messageId);
      if (original && !original.system) {
        replyPayload = {
          messageId: original.id,
          text: original.text,
          fromName: original.from?.name || "Хтось",
        };
      }
    }

    const message = {
      id: randomUUID(),
      from: { userId: member.userId, name: member.name, avatarUrl: member.avatarUrl },
      text: trimmed,
      ts: Date.now(),
      replyTo: replyPayload,
      reactions: {},
    };

    room.addChatMessage(message);
    io.to(room.code).emit("chat:message", message);
  });

  /**
   * Реакція на повідомлення в чаті (❤️ 🔥 😂 тощо).
   * Один користувач - одна реакція на повідомлення (повторний клік
   * тим самим емодзі знімає реакцію, інший емодзі - перемикає).
   */
  socket.on("chat:react", ({ messageId, emoji }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member) return;

    const allowed = ["❤️", "🔥", "😂", "😮", "😢", "👍", "👎", "🎉"];
    if (!allowed.includes(emoji)) return;

    const reactions = room.toggleReaction(messageId, member.userId, emoji);
    if (!reactions) return;

    io.to(room.code).emit("chat:reaction_update", { messageId, reactions });
  });

  /**
   * Плаваючі емоджі-реакції (TikTok/Rave-style).
   * Не зберігаються в історії - лише миттєва розсилка.
   */
  socket.on("reaction:send", ({ emoji }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member) return;

    const allowed = ["❤️", "😂", "😮", "👍", "🔥", "😢", "🎉"];
    if (!allowed.includes(emoji)) return;

    io.to(room.code).emit("reaction:broadcast", {
      from: { userId: member.userId, name: member.name },
      emoji,
      ts: Date.now(),
    });
  });

  /**
   * Додавання відео в черту (плейлист).
   */
  socket.on("playlist:add", ({ url, title }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member) return;

    const payload = buildVideoPayload(url, title);
    if (payload.error) {
      socket.emit("error", { message: payload.error });
      return;
    }

    const item = { ...payload.video, addedBy: member.name };
    room.addToPlaylist(item);
    io.to(room.code).emit("playlist:updated", { playlist: room.playlist });
  });

  /**
   * Хост перемикає на наступне відео з плейлиста.
   */
  socket.on("playlist:next", () => {
    const room = getRoomForSocket(socket);
    if (!room) return;

    const member = room.getMember(socket.id);
    if (!member?.isHost) return;

    const next = room.playlist.shift();
    if (!next) return;

    room.setVideo(next);
    io.to(room.code).emit("video:changed", { video: room.video });
    io.to(room.code).emit("playback:update", {
      currentTime: 0,
      isPlaying: false,
      updatedAt: room.playback.updatedAt,
    });
    io.to(room.code).emit("playlist:updated", { playlist: room.playlist });
  });

  socket.on("disconnect", () => {
    const result = roomManager.leaveBySocketId(socket.id);
    if (!result || result.becameEmpty) return;

    const { room, newHost } = result;

    io.to(room.code).emit("room:members", room.toJSON().members);

    if (newHost) {
      io.to(room.code).emit("chat:message", {
        from: { name: newHost.name, system: true },
        text: `${newHost.name} став новим хостом`,
        ts: Date.now(),
        system: true,
      });
    }
  });

  function getRoomForSocket(socket) {
    const code = socket.data.roomCode;
    if (!code) {
      socket.emit("error", { message: "Ти не в кімнаті" });
      return null;
    }
    const room = roomManager.getRoom(code);
    if (!room) {
      socket.emit("error", { message: "Кімната більше не існує" });
      return null;
    }
    return room;
  }
});

httpServer.listen(PORT, () => {
  console.log(`BananaView backend запущено на порту ${PORT} ✅`);
});
