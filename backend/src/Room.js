import { randomUUID } from "crypto";

/**
 * Генерує короткий код кімнати, наприклад "K7F3X2"
 * Уникає схожих символів (0/O, 1/I/L) для зручності введення вручну.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Один учасник кімнати.
 */
export class Member {
  constructor({ socketId, userId, name, avatarUrl, isHost = false }) {
    this.socketId = socketId;
    this.userId = userId; // Telegram user id (або анонімний UUID)
    this.name = name;
    this.avatarUrl = avatarUrl || null;
    this.isHost = isHost;
    this.joinedAt = Date.now();
    this.watchTimeMs = 0; // скільки часу провів у кімнаті під час playback
  }
}

/**
 * Кімната для спільного перегляду.
 *
 * Логіка синхронізації:
 * - Сервер тримає "канонічний" стан: currentTime, isPlaying, updatedAt
 * - getCurrentTime() рахує реальну позицію відео з урахуванням дрейфу часу
 *   (якщо isPlaying === true, додає (now - updatedAt) до currentTime)
 * - Будь-яка play/pause/seek подія від хоста перезаписує цей стан і
 *   розсилається всім іншим учасникам
 */
export class Room {
  constructor(code, hostMember) {
    this.id = randomUUID();
    this.code = code;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();

    this.members = new Map(); // socketId -> Member

    this.video = {
      url: null,
      type: null, // "youtube" | "drive" | "mp4"
      title: null,
    };

    // Канонічний стан плеєра
    this.playback = {
      currentTime: 0, // секунди
      isPlaying: false,
      updatedAt: Date.now(), // timestamp останнього оновлення стану
    };

    this.chatHistory = []; // останні N повідомлень
    this.maxChatHistory = 100;

    this.playlist = []; // [{ url, type, title, addedBy }]

    if (hostMember) {
      this.addMember(hostMember);
    }
  }

  touch() {
    this.lastActivityAt = Date.now();
  }

  addMember(member) {
    this.members.set(member.socketId, member);
    this.touch();
  }

  removeMember(socketId) {
    this.members.delete(socketId);
    this.touch();
  }

  getMember(socketId) {
    return this.members.get(socketId);
  }

  /**
   * Чи є в кімнаті ще живий хост.
   */
  hasHost() {
    for (const member of this.members.values()) {
      if (member.isHost) return true;
    }
    return false;
  }

  /**
   * Призначає нового хоста (наприклад, якщо старий вийшов).
   * Обирає найдавнішого учасника.
   */
  promoteNextHost() {
    let oldest = null;
    for (const member of this.members.values()) {
      if (!oldest || member.joinedAt < oldest.joinedAt) {
        oldest = member;
      }
    }
    if (oldest) {
      oldest.isHost = true;
      this.touch();
    }
    return oldest;
  }

  /**
   * Розраховує актуальну позицію відео "наживо", враховуючи час,
   * що минув з останнього оновлення стану.
   */
  getCurrentTime() {
    if (!this.playback.isPlaying) {
      return this.playback.currentTime;
    }
    const elapsedSec = (Date.now() - this.playback.updatedAt) / 1000;
    return this.playback.currentTime + elapsedSec;
  }

  /**
   * Оновлює канонічний стан плеєра (викликається на play/pause/seek).
   */
  setPlayback({ currentTime, isPlaying }) {
    this.playback = {
      currentTime,
      isPlaying,
      updatedAt: Date.now(),
    };
    this.touch();
  }

  setVideo({ url, type, title }) {
    this.video = { url, type, title: title || null };
    this.playback = { currentTime: 0, isPlaying: false, updatedAt: Date.now() };
    this.touch();
  }

  addChatMessage(message) {
    this.chatHistory.push(message);
    if (this.chatHistory.length > this.maxChatHistory) {
      this.chatHistory.shift();
    }
    this.touch();
  }

  addToPlaylist(item) {
    this.playlist.push(item);
    this.touch();
  }

  /**
   * Серіалізація для надсилання клієнту (snapshot стану кімнати)
   */
  toJSON() {
    return {
      code: this.code,
      video: this.video,
      playback: {
        currentTime: this.getCurrentTime(),
        isPlaying: this.playback.isPlaying,
        updatedAt: this.playback.updatedAt,
      },
      members: Array.from(this.members.values()).map((m) => ({
        userId: m.userId,
        name: m.name,
        avatarUrl: m.avatarUrl,
        isHost: m.isHost,
      })),
      chatHistory: this.chatHistory,
      playlist: this.playlist,
      memberCount: this.members.size,
    };
  }
}
