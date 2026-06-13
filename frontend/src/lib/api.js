import { BACKEND_URL } from "./config";

/**
 * Створює нову кімнату.
 * Повертає { ok, code } або кидає помилку.
 */
export async function createRoom({ name, avatarUrl, userId, initData }) {
  const res = await fetch(`${BACKEND_URL}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(initData ? { "X-Telegram-Init-Data": initData } : {}),
    },
    body: JSON.stringify({ name, avatarUrl, userId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Не вдалось створити кімнату");
  }
  return res.json();
}

/**
 * Перевіряє, чи існує кімната з таким кодом.
 */
export async function checkRoom(code) {
  const res = await fetch(`${BACKEND_URL}/api/rooms/${encodeURIComponent(code)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Кімната не знайдена");
  }
  return res.json();
}
