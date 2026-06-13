/**
 * Список відео в черзі. Хост може перейти до наступного.
 */
export default function PlaylistPanel({ playlist, isHost, onNext }) {
  if (playlist.length === 0) return null;

  return (
    <div className="px-4 py-3 bg-panel rounded-blob flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-banana font-semibold">
          Черга ({playlist.length})
        </p>
        {isHost && (
          <button
            onClick={onNext}
            className="text-xs bg-banana text-ink font-display font-semibold rounded-full px-3 py-1 active:scale-95 transition-transform"
          >
            Наступне ▶
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {playlist.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-panel2 rounded-full px-3 py-1.5">
            <span className="text-sm text-cream truncate">
              {item.title || item.originalUrl || item.url}
            </span>
            <span className="text-[10px] text-mist shrink-0 ml-2">{item.addedBy}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
