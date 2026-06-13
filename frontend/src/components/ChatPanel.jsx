import { useEffect, useRef, useState } from "react";

/**
 * Панель чату: історія повідомлень + поле введення.
 * Системні повідомлення (приєднання, зміна хоста) виділені окремо.
 */
export default function ChatPanel({ chatHistory, onSend, myUserId }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2">
        {chatHistory.length === 0 && (
          <p className="text-mist text-sm text-center mt-6">
            Поки тихо. Напиши щось першим 👋
          </p>
        )}
        {chatHistory.map((msg, i) => (
          <ChatMessage key={i} msg={msg} isMine={msg.from?.userId === myUserId} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-panel2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написати в чат..."
          maxLength={500}
          className="flex-1 bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-banana"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-banana text-ink font-display font-semibold rounded-full px-4 py-2.5 text-sm disabled:opacity-40 active:scale-95 transition-transform"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatMessage({ msg, isMine }) {
  if (msg.system) {
    return (
      <div className="text-center">
        <span className="text-xs text-mist bg-panel2 rounded-full px-3 py-1">
          {msg.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <span className="text-xs text-mist px-1 mb-0.5">{msg.from?.name}</span>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words ${
          isMine
            ? "bg-banana text-ink rounded-br-md"
            : "bg-panel2 text-cream rounded-bl-md"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}
