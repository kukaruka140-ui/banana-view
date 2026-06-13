import { useState } from "react";

const INPUT_EMOJIS = ["😀", "😂", "😍", "😎", "🤔", "😭", "👍", "❤️", "🔥", "🎉", "👀", "🙏"];

export default function ChatPanel({ chatHistory, onSend, myUserId, onToggleReaction }) {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    setShowEmojiPicker(false); // Закриваємо панель після відправки
  };

  return (
    <div className="flex flex-col h-full bg-panel overflow-hidden relative">
      {/* Історія чату */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse px-3 py-4 gap-2 scrollbar-thin">
        {[...chatHistory].reverse().map((msg, i) => (
          <ChatMessage 
            key={msg.id || i} 
            msg={msg} 
            isMine={msg.from?.userId === myUserId}
            onReact={onToggleReaction}
          />
        ))}
      </div>

      {/* Панель вводу */}
      <div className="bg-panel border-t border-panel2 flex flex-col">
        {/* Панель емодзі, що випадає вгору */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-2 bg-panel2 p-2 rounded-2xl grid grid-cols-6 gap-2 shadow-2xl z-50 border border-mist/10">
            {INPUT_EMOJIS.map(e => (
              <button 
                key={e} 
                onClick={() => setText(text + e)} 
                className="hover:scale-125 transition-transform text-lg p-1"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 p-2">
          {/* Кнопка емодзі */}
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            className="p-2 hover:bg-panel2 rounded-full transition-colors"
          >
            😊
          </button>
          
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-panel2 rounded-full px-4 py-2.5 text-sm text-cream outline-none focus:ring-1 focus:ring-banana"
              placeholder="Написати в чат..."
            />
            <button type="submit" className="text-banana font-bold text-sm px-3">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ msg, isMine, onReact }) {
  return (
    <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
      <div className={`group relative max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
        isMine ? "bg-banana text-ink rounded-tr-none" : "bg-panel2 text-cream rounded-tl-none"
      }`}>
        <p>{msg.text}</p>
        
        {/* Реакції */}
        <div className={`absolute top-0 ${isMine ? "-left-10" : "-right-10"} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
            <button onClick={() => onReact(msg.id, "❤️")} className="text-xs bg-panel2 rounded-full px-2 py-1">❤️</button>
        </div>
      </div>
    </div>
  );
}
