import { useState } from "react";

/**
 * Форма для встановлення поточного відео або додавання в плейлист.
 * Видима лише для хоста.
 */
export default function VideoInput({ onSetVideo, onAddToPlaylist, allowPlayNow = true }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleSubmit = (action) => (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (action === "play") {
      onSetVideo(trimmed, title.trim());
    } else {
      onAddToPlaylist(trimmed, title.trim());
    }
    setUrl("");
    setTitle("");
  };

  return (
    <form className="flex flex-col gap-2 px-4 py-3 bg-panel rounded-blob">
      <p className="font-display text-sm text-banana font-semibold">Додати відео</p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Посилання YouTube, Google Drive або mp4"
        className="bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-banana"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Назва (опційно)"
        className="bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-banana"
      />
      <div className="flex gap-2">
        {allowPlayNow && (
          <button
            onClick={handleSubmit("play")}
            disabled={!url.trim()}
            className="flex-1 bg-banana text-ink font-display font-semibold rounded-full py-2.5 text-sm disabled:opacity-40 active:scale-95 transition-transform"
          >
            Увімкнути зараз
          </button>
        )}
        <button
          onClick={handleSubmit("queue")}
          disabled={!url.trim()}
          className="flex-1 bg-panel2 text-cream font-display font-semibold rounded-full py-2.5 text-sm disabled:opacity-40 active:scale-95 transition-transform"
        >
          У черту
        </button>
      </div>
    </form>
  );
}
