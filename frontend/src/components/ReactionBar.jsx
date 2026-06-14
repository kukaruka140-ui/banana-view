import { useState } from "react";

const EMOJIS = ["❤️", "😂", "😮", "👍", "🔥", "😢", "🎉"];

/**
 * Панель кнопок-реакцій (плаваючі емоджі над плеєром).
 *
 * compact=true: одна кнопка-перемикач, що відкриває рядок реакцій
 * у вигляді popup (економить місце поруч зі списком учасників).
 * compact=false: завжди розгорнутий горизонтальний рядок.
 */
export default function ReactionBar({ onSend, haptic, compact = false }) {
  const [open, setOpen] = useState(false);

  const handleSend = (emoji) => {
    haptic?.("light");
    onSend(emoji);
    if (compact) setOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xl w-9 h-9 flex items-center justify-center rounded-full bg-panel2 active:scale-90 transition-transform"
        >
          😀
        </button>

        {open && (
          <div className="absolute bottom-full right-0 mb-2 flex items-center gap-1 bg-panel border border-panel2 rounded-full px-2 py-1.5 shadow-lg animate-popIn z-10">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="text-xl w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 px-2">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleSend(emoji)}
          className="text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-panel2 active:scale-90 active:bg-panel transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
