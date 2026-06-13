# BananaView

Telegram Mini App для спільного синхронізованого перегляду відео з друзями —
YouTube, Google Drive, прямі mp4-посилання. Чат, реакції в реальному часі,
плейлист, автоматичне визначення хоста.

## Структура проекту

```
bananaview/
├── backend/    # Express + Socket.io сервер (Railway)
├── frontend/   # React + Vite + Tailwind Mini App (Vercel)
└── bot/        # Telegram-бот на grammY (запуск Mini App, deep-links)
```

## Як це працює

1. **bot/** — користувач пише `/start` боту, отримує кнопку, яка відкриває
   Mini App. Якщо перейшов по запрошенню (`/start КОД`), Mini App відкривається
   одразу з кодом кімнати.
2. **frontend/** — Mini App: створює кімнату (`POST /api/rooms`) або
   приєднується по коду, далі все спілкування йде через Socket.io
   (синхронізація плеєра, чат, реакції, плейлист).
3. **backend/** — тримає стан усіх кімнат у пам'яті (`RoomManager`),
   розраховує "канонічну" позицію відео з урахуванням дрейфу часу,
   проксіює відео з Google Drive (з підтримкою Range для перемотування),
   і опційно перевіряє підпис `initData` від Telegram.

## Швидкий старт (локально)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Запуститься на `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Відкриється на `http://localhost:5173`. `VITE_BACKEND_URL` в `.env` має
вказувати на backend (за замовчуванням `http://localhost:3001`).

### 3. Bot

```bash
cd bot
cp .env.example .env
npm install
npm start
```

Заповни `BOT_TOKEN` (від [@BotFather](https://t.me/BotFather)) та
`MINI_APP_URL` (URL фронтенду — для локального тесту Telegram не зможе
відкрити `localhost`, тож для повноцінного тесту Mini App потрібен публічний
URL, наприклад через ngrok або після деплою на Vercel).

## Деплой

### Backend → Railway

1. Створи новий проєкт, підключи папку `backend/`
2. Start command: `npm start`
3. Додай змінні середовища з `.env.example`:
   - `BOT_TOKEN` — для верифікації `initData`
   - `FRONTEND_ORIGIN` — домен Vercel (для CORS)
   - `ROOM_TTL_MS` — опційно, час життя неактивної кімнати

### Frontend → Vercel

1. Підключи папку `frontend/`
2. Framework preset: Vite
3. Додай змінні середовища:
   - `VITE_BACKEND_URL` — URL backend на Railway
   - `VITE_BOT_USERNAME` — username бота (без @), для кнопки "Поділитись"

### Bot → Railway (окремий сервіс) або будь-який Node-хостинг

1. Підключи папку `bot/`
2. Start command: `npm start`
3. Додай `BOT_TOKEN` та `MINI_APP_URL` (URL з Vercel)

### Налаштування в @BotFather

1. `/mybots` → обери бота → **Bot Settings → Menu Button** → встанови URL
   Mini App (URL з Vercel)
2. (опційно) **Configure Mini App**, щоб кнопка з'являлась і в груповому чаті

## Функції

- Синхронізований плеєр: play/pause/seek для всіх учасників (хост керує,
  компенсація дрейфу часу для тих, хто приєднався пізніше)
- Підтримка YouTube (IFrame API), Google Drive (через `driveProxy` з
  підтримкою Range-запитів для seek), та прямих mp4/webm/m3u8 посилань
- Чат у реальному часі + системні повідомлення (приєднання, зміна хоста)
- Плаваючі емоджі-реакції
- Плейлист: додавання відео в черту, перехід до наступного
- Автоматичне призначення нового хоста, якщо попередній вийшов
- Верифікація Telegram `initData` (опційно — працює і без неї для веб-версії)
- Deep-link запрошення: `/start КОД_КІМНАТИ` одразу відкриває потрібну кімнату

## Технічний стек

- **Backend**: Node.js, Express, Socket.io, node-fetch
- **Frontend**: React, Vite, Tailwind CSS, socket.io-client
- **Bot**: grammY
- **Дані**: in-memory (Map) — без зовнішньої бази даних

## Подальші ідеї

- Перенести `RoomManager` на Redis для горизонтального масштабування
- Статистика спільного перегляду (час, проведений разом)
- Локалізація (укр/рос/англ)
- HLS-плеєр для прямих `.m3u8` посилань
