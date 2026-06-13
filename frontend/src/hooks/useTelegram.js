import { useEffect, useState } from "react";

/**
 * Хук-обгортка для Telegram.WebApp SDK.
 *
 * Повертає:
 *  - tg: сам об'єкт window.Telegram.WebApp (або null, якщо відкрито поза Telegram)
 *  - user: дані юзера з initDataUnsafe.user
 *  - startParam: параметр deep-link (room code), якщо є
 *  - initData: сирий рядок initData (для верифікації на backend)
 *  - isTelegram: чи запущено всередині Telegram
 *  - haptic(type): викликає haptic feedback
 *  - theme: кольори теми Telegram (для адаптації UI, опційно)
 */
export function useTelegram() {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    // Розгортаємо на весь екран, де доступно (Bot API 8.0+)
    try {
      webApp.disableVerticalSwipes?.();
    } catch {
      // старіша версія клієнта - ігноруємо
    }

    setTg(webApp);
  }, []);

  const isTelegram = Boolean(tg);
  const user = tg?.initDataUnsafe?.user || null;
  const startParam = tg?.initDataUnsafe?.start_param || null;
  const initData = tg?.initData || "";

  const haptic = (type = "light") => {
    if (!tg?.HapticFeedback) return;
    switch (type) {
      case "success":
      case "error":
      case "warning":
        tg.HapticFeedback.notificationOccurred(type);
        break;
      case "rigid":
      case "heavy":
      case "medium":
      case "light":
      case "soft":
        tg.HapticFeedback.impactOccurred(type);
        break;
      default:
        tg.HapticFeedback.impactOccurred("light");
    }
  };

  return {
    tg,
    isTelegram,
    user,
    startParam,
    initData,
    haptic,
    colorScheme: tg?.colorScheme || "dark",
  };
}
