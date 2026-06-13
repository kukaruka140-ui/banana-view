import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../lib/config";

/**
 * Керує Socket.io з'єднанням і всім станом кімнати на клієнті.
 *
 * Використання:
 *   const room = useRoom();
 *   room.join({ code, name, avatarUrl, userId });
 *   room.setVideo(url, title);
 *   room.syncPlayback(currentTime, isPlaying);
 *   room.sendChat(text);
 *   room.sendReaction(emoji);
 */
export function useRoom() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const [code, setCode] = useState(null);
  const [video, setVideoState] = useState(null);
  const [members, setMembers] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [playback, setPlayback] = useState({
    currentTime: 0,
    isPlaying: false,
    updatedAt: Date.now(),
  });
  const [reactions, setReactions] = useState([]); // { id, emoji, ts }
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null); // { userId, name }

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room:state", (state) => {
      setCode(state.code);
      setVideoState(state.video);
      setMembers(state.members);
      setChatHistory(state.chatHistory);
      setPlaylist(state.playlist);
      setPlayback({
        currentTime: state.playback.currentTime,
        isPlaying: state.playback.isPlaying,
        updatedAt: state.playback.updatedAt,
      });
    });

    socket.on("room:members", (members) => setMembers(members));

    socket.on("video:changed", ({ video }) => setVideoState(video));

    socket.on("playback:update", (update) => setPlayback(update));

    socket.on("chat:message", (msg) =>
      setChatHistory((prev) => [...prev.slice(-99), msg])
    );

    socket.on("playlist:updated", ({ playlist }) => setPlaylist(playlist));

    socket.on("reaction:broadcast", ({ emoji }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, emoji, ts: Date.now() }]);
      // авто-видалення після завершення анімації
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    });

    socket.on("error", ({ message }) => setError(message));

    return () => {
      socket.disconnect();
    };
  }, []);

  const join = useCallback(({ code, name, avatarUrl, userId }) => {
    setMe({ userId, name });
    socketRef.current?.emit("room:join", { code, name, avatarUrl, userId });
  }, []);

  const setVideo = useCallback((url, title) => {
    socketRef.current?.emit("video:set", { url, title });
  }, []);

  const syncPlayback = useCallback((currentTime, isPlaying) => {
    socketRef.current?.emit("playback:sync", { currentTime, isPlaying });
  }, []);

  const requestSync = useCallback(() => {
    socketRef.current?.emit("playback:request_sync");
  }, []);

  const sendChat = useCallback((text) => {
    socketRef.current?.emit("chat:message", { text });
  }, []);

  const sendReaction = useCallback((emoji) => {
    socketRef.current?.emit("reaction:send", { emoji });
  }, []);

  const addToPlaylist = useCallback((url, title) => {
    socketRef.current?.emit("playlist:add", { url, title });
  }, []);

  const playNext = useCallback(() => {
    socketRef.current?.emit("playlist:next");
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isHost = Boolean(
    me && members.find((m) => m.userId === me.userId)?.isHost
  );

  return {
    connected,
    code,
    video,
    members,
    chatHistory,
    playlist,
    playback,
    reactions,
    error,
    me,
    isHost,
    join,
    setVideo,
    syncPlayback,
    requestSync,
    sendChat,
    sendReaction,
    addToPlaylist,
    playNext,
    clearError,
  };
}
