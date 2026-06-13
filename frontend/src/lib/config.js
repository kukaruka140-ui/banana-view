/**
 * Базовий URL backend.
 *
 * При деплої на Vercel вкажи змінну середовища VITE_BACKEND_URL,
 * що вказує на твій Railway backend (наприклад
 * https://bananaview-backend.up.railway.app)
 *
 * Локально за замовчуванням - localhost:3001
 */
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
