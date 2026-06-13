const EMOJIS = ["❤️", "😂", "😮", "👍", "🔥", "😢", "🎉"];

/**
 * Горизонтальна панель кнопок-реакцій.
 * Кожне натискання надсилає reaction:send і запускає haptic feedback.
 */
export default function ReactionBar({ onSend, haptic }) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-2">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            haptic?.("light");
            onSend(emoji);
          }}
          className="text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-panel2 active:scale-90 active:bg-panel transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
