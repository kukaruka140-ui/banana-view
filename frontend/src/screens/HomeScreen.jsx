import { useState } from "react";
import { createRoom, checkRoom } from "../lib/api";

/**
 * Стартовий екран: показує логотип BananaView, поле для імені
 * та дві дії - створити кімнату або ввести код для приєднання.
 */
export default function HomeScreen({ defaultName, initialCode, initData, onEnter, haptic }) {
  const [name, setName] = useState(defaultName || "");
  const [code, setCode] = useState(initialCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Введи своє ім'я");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userId = `web-${Math.random().toString(36).slice(2, 10)}`;
      const res = await createRoom({ name: name.trim(), userId, initData });
      haptic?.("success");
      onEnter({ code: res.code, name: name.trim(), userId });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Введи своє ім'я");
      return;
    }
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError("Введи код кімнати");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await checkRoom(trimmedCode);
      haptic?.("success");
      const userId = `web-${Math.random().toString(36).slice(2, 10)}`;
      onEnter({ code: trimmedCode, name: name.trim(), userId });
    } catch (e) {
      haptic?.("error");
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-6xl mb-2">🍌</div>
        <h1 className="font-display text-4xl font-extrabold text-banana">BananaView</h1>
        <p className="text-mist text-sm max-w-xs">
          Дивіться відео разом — синхронний плеєр, чат і реакції в реальному часі
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-mist font-medium px-1">Твоє ім'я</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад, Олекса"
            maxLength={30}
            className="bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-banana"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-banana text-ink font-display font-bold rounded-blob py-3.5 text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          Створити кімнату
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-panel2" />
          <span className="text-mist text-xs">або</span>
          <div className="flex-1 h-px bg-panel2" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-mist font-medium px-1">Код кімнати</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7F3X2"
            maxLength={8}
            className="bg-panel2 text-cream placeholder:text-mist rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-banana font-display tracking-widest text-center uppercase"
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          className="bg-panel2 text-cream font-display font-bold rounded-blob py-3.5 text-base disabled:opacity-50 active:scale-95 transition-transform"
        >
          Приєднатись
        </button>

        {error && (
          <p className="text-coral text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
