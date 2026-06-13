/**
 * Визначає тип відео за посиланням та витягує потрібний ідентифікатор.
 *
 * Підтримувані формати:
 * - YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 * - Google Drive: drive.google.com/file/d/ID/view, drive.google.com/open?id=ID
 * - mp4 / прямі посилання: будь-яке інше http(s) посилання на відеофайл
 */
export function parseVideoUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { type: "invalid", error: "Невірний URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { type: "invalid", error: "Підтримуються лише http/https посилання" };
  }

  const host = url.hostname.replace(/^www\./, "");

  // --- YouTube ---
  if (host === "youtube.com" || host === "m.youtube.com") {
    let videoId = url.searchParams.get("v");
    if (!videoId && url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2];
    }
    if (!videoId && url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2];
    }
    if (videoId) {
      return { type: "youtube", videoId, embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    return { type: "invalid", error: "Не вдалось знайти ID відео YouTube" };
  }

  if (host === "youtu.be") {
    const videoId = url.pathname.slice(1);
    if (videoId) {
      return { type: "youtube", videoId, embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    return { type: "invalid", error: "Не вдалось знайти ID відео YouTube" };
  }

  // --- Google Drive ---
  if (host === "drive.google.com") {
    let fileId = null;

    // /file/d/FILE_ID/view
    const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) {
      fileId = fileMatch[1];
    }

    // ?id=FILE_ID (старий формат open?id=)
    if (!fileId) {
      fileId = url.searchParams.get("id");
    }

    if (fileId) {
      return {
        type: "drive",
        fileId,
        // Прямий стрім через наш driveProxy, щоб уникнути CORS і
        // дозволити Range-запити для seek
        proxyUrl: `/api/drive-proxy/${fileId}`,
      };
    }
    return { type: "invalid", error: "Не вдалось знайти ID файлу Google Drive" };
  }

  // --- Все інше вважаємо прямим посиланням (mp4, webm, hls тощо) ---
  const pathname = url.pathname.toLowerCase();
  const knownExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m3u8"];
  const hasKnownExt = knownExtensions.some((ext) => pathname.endsWith(ext));

  return {
    type: "mp4",
    directUrl: url.toString(),
    // Якщо розширення невідоме - попереджаємо фронт, але все одно пробуємо відтворити
    confident: hasKnownExt,
  };
}

/**
 * Готує об'єкт video для збереження в кімнаті на основі результату parseVideoUrl.
 */
export function buildVideoPayload(rawUrl, title) {
  const parsed = parseVideoUrl(rawUrl);

  if (parsed.type === "invalid") {
    return { error: parsed.error };
  }

  let playUrl;
  switch (parsed.type) {
    case "youtube":
      playUrl = parsed.embedUrl;
      break;
    case "drive":
      playUrl = parsed.proxyUrl;
      break;
    case "mp4":
      playUrl = parsed.directUrl;
      break;
  }

  return {
    video: {
      url: playUrl,
      originalUrl: rawUrl,
      type: parsed.type,
      title: title || null,
    },
  };
}
