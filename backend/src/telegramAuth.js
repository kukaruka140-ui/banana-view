import crypto from "crypto";

/**
 * Перевіряє підпис initData, який Telegram Mini App передає на backend.
 *
 * Алгоритм (офіційна документація Telegram):
 * 1. Розпарсити query-string initData на пари key=value
 * 2. Витягнути та видалити поле "hash"
 * 3. Відсортувати решту пар за ключем, з'єднати у вигляді "key=value\n"
 * 4. secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)
 * 5. Обчислити HMAC_SHA256(data_check_string, secret_key) у hex
 * 6. Порівняти з переданим hash
 *
 * Повертає { ok: true, user, authDate, startParam } або { ok: false, reason }
 */
export function verifyTelegramInitData(initData, botToken) {
  if (!initData || typeof initData !== "string") {
    return { ok: false, reason: "initData відсутній" };
  }
  if (!botToken) {
    return { ok: false, reason: "BOT_TOKEN не налаштований на сервері" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, reason: "hash відсутній в initData" };
  }
  params.delete("hash");

  const dataCheckArr = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash !== hash) {
    return { ok: false, reason: "Невірний підпис (hash mismatch)" };
  }

  // Перевірка свіжості (опційно, за замовчуванням 24 години)
  const authDate = Number(params.get("auth_date"));
  const MAX_AGE_SEC = 24 * 60 * 60;
  if (authDate && Date.now() / 1000 - authDate > MAX_AGE_SEC) {
    return { ok: false, reason: "initData застарілий" };
  }

  let user = null;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      return { ok: false, reason: "Не вдалось розпарсити user" };
    }
  }

  return {
    ok: true,
    user,
    authDate,
    startParam: params.get("start_param") || null,
  };
}

/**
 * Express middleware: очікує заголовок X-Telegram-Init-Data.
 * Якщо BOT_TOKEN не налаштований - пропускає запит як "гостьовий"
 * (req.telegramUser = null), щоб локальна розробка без бота працювала.
 */
export function telegramAuthMiddleware(botToken) {
  return (req, res, next) => {
    const initData = req.headers["x-telegram-init-data"];

    if (!initData) {
      req.telegramUser = null;
      req.telegramStartParam = null;
      return next();
    }

    const result = verifyTelegramInitData(initData, botToken);
    if (!result.ok) {
      return res.status(401).json({ error: "Невірна авторизація Telegram", reason: result.reason });
    }

    req.telegramUser = result.user;
    req.telegramStartParam = result.startParam;
    next();
  };
}
