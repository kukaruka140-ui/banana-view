import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Проксі для стрімінгу відео з Google Drive.
 *
 * Навіщо це потрібно:
 * - Google Drive не дає прямого CORS-доступу до відеофайлів з браузера
 * - <video> тег потребує підтримки Range-запитів для перемотування (seek),
 *   а звичайне посилання на завантаження Drive не завжди коректно
 *   обробляє Range
 *
 * Як працює:
 * 1. Клієнт запитує GET /api/drive-proxy/:fileId з заголовком Range (опційно)
 * 2. Ми форвардимо запит на googleusercontent download endpoint,
 *    передаючи той самий Range
 * 3. Відповідь (включно зі статусом 206 Partial Content та заголовками
 *    Content-Range/Content-Length/Accept-Ranges) проксіюємо назад клієнту
 *
 * Примітка: файл має бути доступний за посиланням "Будь-хто з посиланням".
 */

const DRIVE_DOWNLOAD_BASE = "https://drive.usercontent.google.com/download";

router.get("/drive-proxy/:fileId", async (req, res) => {
  const { fileId } = req.params;

  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return res.status(400).json({ error: "Невірний fileId" });
  }

  const driveUrl = `${DRIVE_DOWNLOAD_BASE}?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

  try {
    const forwardHeaders = {};
    if (req.headers.range) {
      forwardHeaders.Range = req.headers.range;
    }

    const driveRes = await fetch(driveUrl, {
      headers: forwardHeaders,
      redirect: "follow",
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      return res.status(driveRes.status).json({
        error: `Google Drive повернув статус ${driveRes.status}. Перевір, що файл відкритий для всіх за посиланням.`,
      });
    }

    // Проксіюємо ключові заголовки для коректного streaming/seek
    const passthroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
    ];

    for (const header of passthroughHeaders) {
      const value = driveRes.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    if (!res.getHeader("accept-ranges")) {
      res.setHeader("Accept-Ranges", "bytes");
    }

    res.status(driveRes.status);

    driveRes.body.pipe(res);
  } catch (err) {
    console.error("driveProxy помилка:", err);
    res.status(502).json({ error: "Не вдалось завантажити файл з Google Drive" });
  }
});

export default router;
