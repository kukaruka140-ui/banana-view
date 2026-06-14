import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import MessageActionSheet from "./MessageActionSheet";

/**
 * Чат кімнати в стилі Telegram.
 *
 * Поведінка скролу:
 *  - При відкритті - одразу скролимо в самий низ (без анімації)
 *  - Якщо користувач знаходиться внизу і приходить нове повідомлення -
 *    плавно скролимо вниз
 *  - Якщо користувач проскролив вгору (читає історію) - НЕ скролимо
 *    автоматично, натомість показуємо кнопку "нові повідомлення"
 *
 * Дії з повідомленням (тап або long-press на бульбашці):
 *  - відкриває нижню панель з швидкими реакціями та кнопкою "Відповісти"
 *  - реакції транслюються через chat:react, лічильники показуються
 *    під бульбашкою
 */
export default function ChatPanel({ chatHistory, onSend, onReact, myUserId }) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [activeMessage, setActiveMessage] = useState(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const listRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const isFirstRenderRef = useRef(true);

  // Скрол до низу
  const scrollToBottom = (smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Стеження за позицією скролу
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 60;
    isAtBottomRef.current = atBottom;
    if (atBottom) setShowJumpToBottom(false);
  };

  // При відкритті кімнати - миттєвий скрол вниз
  useEffect(() => {
    if (isFirstRenderRef.current && chatHistory.length > 0) {
      scrollToBottom(false);
      isFirstRenderRef.current = false;
    }
  }, [chatHistory.length]);

  // При новому повідомленні
  useEffect(() => {
    if (isFirstRenderRef.current) return;

    if (isAtBottomRef.current) {
      scrollToBottom(true);
    } else {
      setShowJumpToBottom(true);
    }
  }, [chatHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, replyTo);
    setText("");
    setReplyTo(null);
    isAtBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));
  };

  const handleJumpToBottom = () => {
    isAtBottomRef.current = true;
    setShowJumpToBottom(false);
    scrollToBottom(true);
  };

  return (
    <div className="flex flex-col h-full relative">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 flex flex-col gap-1.5"
      >
        {chatHistory.length === 0 && (
          <p className="text-mist text-sm text-center mt-6">
            Поки тихо. Напиши щось першим 👋
          </p>
        )}
        {chatHistory.map((msg, i) => (
          <ChatMessage
            key={msg.id || i}
            msg={msg}
            isMine={msg.from?.userId === myUserId}
            myUserId={myUserId}
            onOpenActions={() => !msg.system && setActiveMessage(msg)}
          />
        ))}
      </div>

      {showJumpToBottom && (
        <button
          onClick={handleJumpToBottom}
          className="absolute bottom-20 right-4 bg-banana text-ink font-display font-semibold rounded-full px-3 py-1.5 text-xs shadow-lg active:scale-95 transition-transform"
        >
          ↓ Нові повідомлення
        </button>
      )}

      {/* Прев'ю відповіді */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-panel2 bg-panel">
          <div className="w-1 self-stretch bg-banana rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-banana font-medium">{replyTo.from?.name}</p>
            <p className="text-xs text-mist truncate">{replyTo.text}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-mist text-lg px-1 shrink-0"
            aria-label="Скасувати відповідь"
          >
            ✕
          </button>
        </div>
      )}

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
          ➤
        </button>
      </form>

      {activeMessage && (
        <MessageActionSheet
          message={activeMessage}
          onClose={() => setActiveMessage(null)}
          onReact={(emoji) => {
            onReact(activeMessage.id, emoji);
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
      <div className="text-center my-1">
        <span className="text-xs text-mist bg-panel2 rounded-full px-3 py-1">
          {msg.text}
        </span>
      </div>
    );
  }

  const time = formatTime(msg.ts);
  const reactionEntries = Object.entries(msg.reactions || {}).filter(
    ([, users]) => users.length > 0
  );

  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {!isMine && <Avatar name={msg.from?.name} avatarUrl={msg.from?.avatarUrl} size={28} />}

      <div className={`flex flex-col max-w-[78%] ${isMine ? "items-end" : "items-start"}`}>
        {!isMine && (
          <span className="text-xs text-banana font-medium px-1 mb-0.5">{msg.from?.name}</span>
        )}

        <button
          onClick={onOpenActions}
          className={`text-left px-3 py-2 rounded-2xl text-sm break-words active:scale-[0.98] transition-transform ${
            isMine
              ? "bg-banana text-ink rounded-br-md"
              : "bg-panel2 text-cream rounded-bl-md"
          }`}
        >
          {msg.replyTo && (
            <div
              className={`mb-1 pl-2 border-l-2 rounded-sm ${
                isMine ? "border-ink/40" : "border-banana"
              }`}
            >
              <p className={`text-xs font-medium ${isMine ? "text-ink/70" : "text-banana"}`}>
                {msg.replyTo.fromName}
              </p>
              <p className={`text-xs truncate ${isMine ? "text-ink/60" : "text-mist"}`}>
                {msg.replyTo.text}
              </p>
            </div>
          )}

          <div className="flex items-end gap-2">
            <span className="whitespace-pre-wrap">{msg.text}</span>
            <span className={`text-[10px] shrink-0 self-end ${isMine ? "text-ink/60" : "text-mist"}`}>
              {time}
            </span>
          </div>
        </button>

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactionEntries.map(([emoji, users]) => (
              <span
                key={emoji}
                className={`text-xs rounded-full px-1.5 py-0.5 flex items-center gap-1 ${
                  users.includes(myUserId)
                    ? "bg-banana/20 border border-banana/60"
                    : "bg-panel2"
                }`}
              >
                {emoji} {users.length}
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
