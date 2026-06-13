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
 * Головний екран кімнати.
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
    toggleMessageReaction, // НОВИЙ МЕТОД з useRoom (потрібно буде додати)
  } = room;

  // Якщо хост ще не вибрав відео - автоматично відкриваємо таб керування для хоста
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-panel2">
        <button onClick={onLeave} className="text-mist text-sm px-2 py-1 -ml-2">
          ← Вийти
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-banana tracking-widest text-lg">
            {code}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-coral animate-pulseDot"
            }`}
            title={connected ? "Підключено" : "Підключення..."}
          />
        </div>
        <button
          onClick={handleShare}
          className="bg-banana text-ink font-display font-semibold rounded-full px-3 py-1.5 text-sm active:scale-95 transition-transform"
        >
          Поділитись
        </button>
      </header>

      {/* Error toast */}
      {error && (
        <div
          onClick={clearError}
          className="mx-4 mt-3 bg-coral/15 border border-coral/40 text-coral text-sm rounded-2xl px-4 py-2 text-center cursor-pointer"
        >
          {error}
        </div>
      )}

      {/* Player (ОНОВЛЕНО: додано класи w-full max-w-5xl mx-auto для збільшення розміру) */}
      <div className="relative px-4 pt-4 w-full max-w-5xl mx-auto flex-shrink-0">
        <VideoPlayer
          video={video}
          playback={playback}
          isHost={isHost}
          onSync={syncPlayback}
        />
        <ReactionsOverlay reactions={reactions} />
      </div>

      {video?.title && (
        <p className="px-4 pt-2 text-sm text-cream font-medium truncate max-w-5xl mx-auto w-full">
          {video.title}
        </p>
      )}

      {/* Members */}
      <MembersBar members={members} />

      {/* Floating Reactions */}
      <div className="py-2">
        <ReactionBar onSend={sendReaction} haptic={haptic} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <TabButton active={tab === TABS.CHAT} onClick={() => setTab(TABS.CHAT)}>
          💬 Чат
        </TabButton>
        <TabButton active={tab === TABS.VIDEO} onClick={() => setTab(TABS.VIDEO)}>
          🎬 Відео {isHost ? "" : "та черга"}
        </TabButton>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === TABS.CHAT && (
          <ChatPanel 
            chatHistory={chatHistory} 
            onSend={sendChat} 
            myUserId={me?.userId}
            onToggleReaction={toggleMessageReaction} // Передаємо новий пропс
          />
        )}

        {tab === TABS.VIDEO && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col gap-3">
            <VideoInput
              onSetVideo={setVideo}
              onAddToPlaylist={addToPlaylist}
              allowPlayNow={isHost}
            />
            {!isHost && (
              <div className="px-4 py-3 bg-panel rounded-blob text-sm text-mist">
                Лише хост може змінювати відео зараз. Можеш додати щось у черту 👆
              </div>
            )}
            <PlaylistPanel playlist={playlist} isHost={isHost} onNext={playNext} />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 font-display font-semibold text-sm rounded-full py-2 transition-colors ${
        active ? "bg-banana text-ink" : "bg-panel2 text-mist"
      }`}
    >
      {children}
    </button>
  );
}
