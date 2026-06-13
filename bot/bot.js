import { Bot, InlineKeyboard } from "grammy";
import "dotenv/config";

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN не вказаний у .env");
}
if (!MINI_APP_URL) {
  throw new Error("MINI_APP_URL не вказаний у .env");
}

const bot = new Bot(BOT_TOKEN);

/**
 * Будує посилання на Mini App.
 * roomCode передається через параметр startapp, який доступний
 * у фронтенді як Telegram.WebApp.initDataUnsafe.start_param
 */
function buildMiniAppUrl(roomCode) {
  const url = new URL(MINI_APP_URL);
  if (roomCode) {
    url.searchParams.set("startapp", roomCode);
  }
  return url.toString();
}

/**
 * /start - головне меню
 * Підтримує deep-link: /start ROOMCODE (з посилання t.me/bot?start=ROOMCODE)
 */
bot.command("start", async (ctx) => {
  const roomCode = ctx.match?.trim();

  if (roomCode) {
    const keyboard = new InlineKeyboard().webApp(
      `🍌 Приєднатись до кімнати ${roomCode}`,
      buildMiniAppUrl(roomCode)
    );

    await ctx.reply(
      `Тебе запросили у кімнату *${roomCode}*!\n\nНатискай кнопку нижче, щоб приєднатись 👇`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    return;
  }

  const keyboard = new InlineKeyboard()
    .webApp("🍌 Відкрити BananaView", buildMiniAppUrl())
    .row()
    .text("📺 Створити кімнату", "create_room")
    .text("🔑 Приєднатись по коду", "join_room");

  await ctx.reply(
    "Привіт! 👋\n\n" +
      "*BananaView* — дивись відео разом з друзями в реальному часі: YouTube, Google Drive, прямі mp4-посилання.\n\n" +
      "• Створюй кімнату та запрошуй друзів\n" +
      "• Синхронізований плеєр (play/pause/seek)\n" +
      "• Чат і реакції прямо під час перегляду\n\n" +
      "Натискай кнопку, щоб почати 👇",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

/**
 * /watch <код> - швидкий запуск конкретної кімнати
 */
bot.command("watch", async (ctx) => {
  const roomCode = ctx.match?.trim().toUpperCase();

  if (!roomCode) {
    await ctx.reply(
      "Вкажи код кімнати, наприклад:\n`/watch K7F3X2`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const keyboard = new InlineKeyboard().webApp(
    `🍌 Перейти в кімнату ${roomCode}`,
    buildMiniAppUrl(roomCode)
  );

  await ctx.reply(`Відкриваю кімнату *${roomCode}*...`, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

/**
 * Кнопка "Створити кімнату" - відкриває Mini App,
 * де користувач створює кімнату через UI (POST /api/rooms)
 */
bot.callbackQuery("create_room", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp(
    "🍌 Створити кімнату",
    buildMiniAppUrl()
  );
  await ctx.answerCallbackQuery();
  await ctx.reply("Натискай, щоб створити нову кімнату 👇", {
    reply_markup: keyboard,
  });
});

/**
 * Кнопка "Приєднатись по коду" - просить надіслати код
 */
bot.callbackQuery("join_room", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    "Надішли код кімнати (наприклад `K7F3X2`), і я дам кнопку для входу.\n\n" +
      "Або скористайся командою:\n`/watch КОД`",
    { parse_mode: "Markdown" }
  );
});

/**
 * Якщо текст схожий на код кімнати (5-7 символів, букви+цифри без 0/O/1/I/L) -
 * пропонуємо приєднатись.
 */
const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{5,7}$/i;

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (ROOM_CODE_REGEX.test(text)) {
    const roomCode = text.toUpperCase();
    const keyboard = new InlineKeyboard().webApp(
      `🍌 Приєднатись до ${roomCode}`,
      buildMiniAppUrl(roomCode)
    );
    await ctx.reply(`Схоже на код кімнати! Приєднатись?`, {
      reply_markup: keyboard,
    });
  }
});

bot.catch((err) => {
  console.error("Помилка бота:", err.error);
});

bot.start();
console.log("BananaView Telegram bot запущено ✅");
