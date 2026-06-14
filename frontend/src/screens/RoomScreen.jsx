import { useEffect, useState } from "react";
import VideoPlayer from "../components/VideoPlayer";
import ChatPanel from "../components/ChatPanel";
import MembersBar from "../components/MembersBar";
import ReactionBar from "../components/ReactionBar";
import ReactionsOverlay from "../components/ReactionsOverlay";
import VideoInput from "../components/VideoInput";
import PlaylistPanel from "../components/PlaylistPanel";

const TABS = {
  CHAT: "chat",
  VIDEO: "video",
};

/**
 * Головний екран кімнати BananaView.
 * * Оптимізована структура: Плеєр максимально великий зверху,
 * Панель управління та Чат — знизу, фіксовані і стабільні.
 */
export default function RoomScreen({ room, tg, haptic, onLeave }) {
  const [tab, setTab] = useState(TABS.CHAT);

  const {
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
    syncPlayback,
    sendChat,
    sendReaction,
    setVideo,
    addToPlaylist,
    playNext,
    clearError,
    connected,
    reactToMessage,
    toggleMessageReaction,
  } = room;

  // Якщо хост ще не вибрав відео — автоматично відкриваємо вкладку з вибором відео
  useEffect(() => {
    if (isHost && !video?.url) {
      setTab(TABS.VIDEO);
    }
  }, [isHost, video?.url]);

  const handleShare = () => {
    haptic?.("light");
    const botUsername = import.meta.env.VITE_BOT_USERNAME;
    const shareText = `Приєднуйся до перегляду на BananaView! Код кімнати: ${code}`;

    if (tg && botUsername) {
      const link = `https://t.me/${botUsername}?start=${code}`;
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
      );
    } else if (navigator.share) {
      navigator.share({ title: "BananaView", text: shareText });
    } else {
      navigator.clipboard?.writeText(code);
    }
  };

  return (
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-ink text-cream">
      {/* Шапка екрану (Header) */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-panel2 shrink-0 bg-panel/30 backdrop-blur-md">
        <button onClick={onLeave} className="text-mist text-sm font-medium px-2 py-1 -ml-2 active:opacity-60 transition-opacity">
          ← Вийти
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-banana tracking-widest text-base">
            {code}
          </span>
          <span
            className={`w-2 h-2 rounded-full shadow-sm ${
              connected ? "bg-green-400" : "bg-coral animate-pulse"
            }`}
            title={connected ? "Підключено" : "Підключення..."}
          />
        </div>
        <button
          onClick={handleShare}
          className="bg-banana text-ink font-display font-bold rounded-full px-3 py-1.5 text-xs shadow-md active:scale-95 transition-transform"
        >
          Поділитись
        </button>
      </header>

      {/* Сповіщення про помилки */}
      {error && (
        <div
          onClick={clearError}
          className="mx-4 mt-2 bg-coral/15 border border-coral/30 text-coral text-xs rounded-xl px-4 py-2 text-center cursor-pointer animate-fadeIn shrink-0"
        >
          {error}
        </div>
      )}

      {/* Збільшений Відео-плеєр */}
      <div className="relative w-full max-w-5xl mx-auto px-3 pt-2 shrink-0 aspect-video">
        <div className="w-full h-full rounded-xl overflow-hidden shadow-xl border border-panel2 bg-black">
          <VideoPlayer
            video={video}
            playback={playback}
            isHost={isHost}
            onSync={syncPlayback}
          />
        </div>
        <ReactionsOverlay reactions={reactions} />
      </div>

      {/* Назва поточного відео */}
      {video?.title && (
        <p className="px-4 py-1 text-xs text-mist font-medium truncate max-w-5xl mx-auto w-full shrink-0">
          🍿 {video.title}
        </p>
      )}

      {/* Рядок учасників та реакцій */}
      <div className="flex items-center justify-between gap-4 px-3 py-1 shrink-0 max-w-5xl mx-auto w-full">
        <div className="flex-1 min-w-0">
          <MembersBar members={members} />
        </div>
        <div className="shrink-0 bg-panel2/40 rounded-full px-2 py-0.5">
          <ReactionBar onSend={sendReaction} haptic={haptic} compact />
        </div>
      </div>

      {/* Перемикач вкладок (Tabs) */}
      <div className="flex items-center gap-2 px-4 py-1.5 shrink-0 max-w-5xl mx-auto w-full">
        <button
          onClick={() => setTab(TABS.CHAT)}
          className={`flex-1 font-display font-semibold text-xs rounded-full py-2 transition-all shadow-sm ${
            tab === TABS.CHAT ? "bg-banana text-ink font-bold scale-102" : "bg-panel2 text-mist"
          }`}
        >
          💬 Чат
        </button>
        <button
          onClick={() => setTab(TABS.VIDEO)}
          className={`flex-1 font-display font-semibold text-xs rounded-full py-2 transition-all shadow-sm ${
            tab === TABS.VIDEO ? "bg-banana text-ink font-bold scale-102" : "bg-panel2 text-mist"
          }`}
        >
          🎬 Керування відео {playlist?.length > 0 ? `(${playlist.length})` : ""}
        </button>
      </div>

      {/* Контент активної вкладки (Займає весь залишковий простір до низу) */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto border-t border-panel2 bg-panel/20">
        {tab === TABS.CHAT ? (
          <ChatPanel
            chatHistory={chatHistory}
            onSend={sendChat}
            myUserId={me?.userId}
            onReact={reactToMessage}
            onToggleReaction={toggleMessageReaction || reactToMessage}
          />
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar px-4 py-3 flex flex-col gap-3">
            <VideoInput
              onSetVideo={setVideo}
              onAddToPlaylist={addToPlaylist}
              allowPlayNow={isHost}
            />
            {!isHost && (
              <div className="px-4 py-3 bg-panel2/60 border border-panel2 rounded-2xl text-xs text-mist text-center">
                Тільки хост може миттєво перемикати плеєр. Але ви можете запропонувати відео до черги вище!
              </div>
            )}
            <PlaylistPanel playlist={playlist} isHost={isHost} onNext={playNext} />
          </div>
        )}
      </div>
    </div>
  );
}
