const QUICK_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👍", "👎", "🎉"];

/**
 * Нижня панель дій для повідомлення: швидкі реакції + "Відповісти".
 * Відкривається тапом або long-press на бульбашці повідомлення.
 */
export default function MessageActionSheet({ message, onReact, onReply, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-panel rounded-t-blob px-4 pt-4 pb-6 animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-panel2 rounded-full mx-auto mb-4" />

        {/* Прев'ю повідомлення */}
        <div className="bg-panel2 rounded-2xl px-3 py-2 mb-4">
          <p className="text-xs text-banana font-medium mb-0.5">{message.from?.name}</p>
          <p className="text-sm text-cream line-clamp-3 break-words">{message.text}</p>
        </div>

        {/* Швидкі реакції */}
        <div className="flex items-center justify-between gap-1 mb-3">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="text-2xl w-9 h-9 flex items-center justify-center rounded-full bg-panel2 active:scale-90 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Відповісти */}
        <button
          onClick={onReply}
          className="w-full flex items-center gap-2 bg-panel2 text-cream font-display font-semibold rounded-full px-4 py-3 text-sm active:scale-95 transition-transform"
        >
          <span className="text-lg">↩️</span> Відповісти
        </button>
      </div>
    </div>
  );
}
