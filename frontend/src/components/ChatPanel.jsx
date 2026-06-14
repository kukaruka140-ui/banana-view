import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import MessageActionSheet from "./MessageActionSheet";

/**
 * Чат кімнати в стилі Telegram (Версія 2.0 - без смикань).
 * * Використовує архітектуру flex-col-reverse:
 * - Нові повідомлення завжди притиснуті до низу.
 * - Скрол тримається знизу автоматично на рівні браузера.
 * - Поле введення статичне і не втікає.
 */
export default function ChatPanel({ chatHistory, onSend, onReact, onToggleReaction, myUserId }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [activeMessage, setActiveMessage] = useState(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const listRef = useRef(null);

  // Функція для обробки реакцій (сумісність з двома варіантами назв пропсів)
  const handleReaction = (messageId, emoji) => {
    if (typeof onToggleReaction === "function") {
      onToggleReaction(messageId, emoji);
    } else if (typeof onReact === "function") {
      onReact(messageId, emoji);
    }
  };

  // Стеження за позицією скролу через нативний метод для flex-col-reverse
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    
    // У flex-col-reverse скрол в самому низу дорівнює 0, а коли гортаємо вгору — стає від'ємним
    const isScrolledUp = el.scrollTop < -120;
    setShowJumpToBottom(isScrolledUp);
  };

  const handleJumpToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
    setShowJumpToBottom(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    // Передаємо id та текст оригінального повідомлення для Reply
    onSend(trimmed, replyTo ? { messageId: replyTo.id, text: replyTo.text, fromName: replyTo.from?.name } : null);
    
    setText("");
    setReplyTo(null);
    
    // Повертаємо скрол до найновішого повідомлення
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
  };

  // Розгортаємо масив для правильної роботи flex-col-reverse (нові повідомлення рендеряться першими в DOM)
  const reversedHistory = [...chatHistory].reverse();

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-panel">
      {/* Список повідомлень */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-none px-4 py-3 flex flex-col-reverse gap-2"
      >
        {reversedHistory.length === 0 ? (
          <p className="text-mist text-sm text-center my-auto transform rotate-180">
            Поки тихо. Напиши щось першим 👋
          </p>
        ) : (
          reversedHistory.map((msg, i) => (
            <ChatMessage
              key={msg.id || i}
              msg={msg}
              isMine={msg.from?.userId === myUserId}
              myUserId={myUserId}
              onOpenActions={() => !msg.system && setActiveMessage(msg)}
            />
          ))
        )}
      </div>

      {/* Кнопка скролу до низу */}
      {showJumpToBottom && (
        <button
          onClick={handleJumpToBottom}
          className="absolute bottom-20 right-4 bg-banana text-ink font-display font-semibold rounded-full px-3 py-1.5 text-xs shadow-lg active:scale-95 transition-transform z-10"
        >
          ↓ Нові повідомлення
        </button>
      )}

      {/* Прев'ю відповіді (Reply) */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-panel2 bg-panel2/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-1 self-stretch bg-banana rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-banana font-medium">{replyTo.from?.name || "Користувач"}</p>
            <p className="text-xs text-mist truncate">{replyTo.text}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-mist text-sm px-2 shrink-0 opacity-70 hover:opacity-100"
            aria-label="Скасувати відповідь"
          >
            ✕
          </button>
        </div>
      )}

      {/* Форма введення тексту */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-panel2 bg-panel shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написати в чат..."
          maxLength={500}
          className="flex-1 bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-banana/50 transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-banana text-ink font-display font-semibold rounded-full w-10 h-10 flex items-center justify-center text-sm disabled:opacity-30 active:scale-95 transition-all shrink-0 shadow-md"
        >
          ➤
        </button>
      </form>

      {/* Нижнє контекстне меню дій */}
      {activeMessage && (
        <MessageActionSheet
          message={activeMessage}
          onClose={() => setActiveMessage(null)}
          onReact={(emoji) => {
            handleReaction(activeMessage.id, emoji);
            setActiveMessage(null);
          }}
          onReply={() => {
            setReplyTo(activeMessage);
            setActiveMessage(null);
          }}
        />
      )}
    </div>
  );
}

function ChatMessage({ msg, isMine, myUserId, onOpenActions }) {
  if (msg.system) {
    return (
      <div className="text-center my-1 transform rotate-0">
        <span className="text-[11px] text-mist bg-panel2/50 rounded-full px-3 py-1 inline-block">
          {msg.text}
        </span>
      </div>
    );
  }

  const time = formatTime(msg.ts);
  const reactionEntries = Object.entries(msg.reactions || {}).filter(
    ([, users]) => users && users.length > 0
  );

  return (
    <div className={`flex gap-2 w-full ${isMine ? "flex-row-reverse" : "flex-row"} animate-messageIn`}>
      {!isMine && <Avatar name={msg.from?.name} avatarUrl={msg.from?.avatarUrl} size={30} />}

      <div className={`flex flex-col max-w-[75%] ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <span className="text-[11px] text-banana font-medium px-1 mb-0.5">{msg.from?.name}</span>
        )}

        <button
          onClick={onOpenActions}
          className={`text-left px-3 py-2 rounded-2xl text-[14px] leading-relaxed break-words shadow-sm transition-transform active:scale-[0.99] relative ${
            isMine
              ? "bg-banana text-ink rounded-tr-sm"
              : "bg-panel2 text-cream rounded-tl-sm"
          }`}
        >
          {/* Візуалізація цитування (Reply) */}
          {msg.replyTo && (
            <div
              className={`mb-1.5 pl-2 border-l-2 text-xs rounded-sm bg-black/10 p-1 ${
                isMine ? "border-ink/40 text-ink/80" : "border-banana text-mist"
              }`}
            >
              <p className="font-semibold text-[11px]">
                {msg.replyTo.fromName || "Повідомлення"}
              </p>
              <p className="truncate text-[11px] opacity-80">
                {msg.replyTo.text}
              </p>
            </div>
          )}

          {/* Текст повідомлення та час */}
          <div className="flex items-end justify-between gap-3 min-w-[50px]">
            <span className="whitespace-pre-wrap selection:bg-banana/30">{msg.text}</span>
            <span className={`text-[9px] select-none uppercase tracking-wider shrink-0 mt-1 ${
              isMine ? "text-ink/60" : "text-mist/60"
            }`}>
              {time}
            </span>
          </div>
        </button>

        {/* Реакції */}
        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 z-10">
            {reactionEntries.map(([emoji, users]) => (
              <span
                key={emoji}
                className={`text-[11px] rounded-full px-2 py-0.5 flex items-center gap-1 font-medium backdrop-blur-md transition-all shadow-sm ${
                  users.includes(myUserId)
                    ? "bg-banana/20 border border-banana/40 text-banana"
                    : "bg-panel2/80 text-cream"
                }`}
              >
                <span>{emoji}</span> 
                <span className="text-[10px] opacity-90">{users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
