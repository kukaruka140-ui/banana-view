import { useEffect, useRef } from "react";
import { BACKEND_URL } from "../lib/config";

/**
 * Відеоплеєр, що підтримує:
 *  - YouTube (через iframe + YouTube IFrame API)
 *  - Google Drive / mp4 (через стандартний <video>)
 *
 * Синхронізація:
 *  - Хост: будь-яка play/pause/seek подія викликає onSync(currentTime, isPlaying)
 *  - Не-хост: при зміні playback (ззовні) плеєр підлаштовується сам,
 *    з толерантністю DRIFT_TOLERANCE секунд, щоб не "стрибати" постійно
 */
const DRIFT_TOLERANCE = 1.5; // секунди

export default function VideoPlayer({ video, playback, isHost, onSync }) {
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const lastAppliedUpdateRef = useRef(0);

  // --- HTML5 <video> (Drive/mp4) ---
  const isHtml5 = video?.type === "drive" || video?.type === "mp4";
  const src = video?.type === "drive" ? `${BACKEND_URL}${video.url}` : video?.url;

  useEffect(() => {
    if (!isHtml5) return;
    const el = videoRef.current;
    if (!el) return;

    const handlePlay = () => {
      if (isHost) onSync(el.currentTime, true);
    };
    const handlePause = () => {
      if (isHost) onSync(el.currentTime, false);
    };
    const handleSeeked = () => {
      if (isHost) onSync(el.currentTime, !el.paused);
    };

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("seeked", handleSeeked);

    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("seeked", handleSeeked);
    };
  }, [isHtml5, isHost, onSync]);

  // Застосовуємо playback update до <video>
  useEffect(() => {
    if (!isHtml5) return;
    if (playback.updatedAt === lastAppliedUpdateRef.current) return;

    const el = videoRef.current;
    if (!el) return;

    lastAppliedUpdateRef.current = playback.updatedAt;

    const drift = Math.abs(el.currentTime - playback.currentTime);
    if (drift > DRIFT_TOLERANCE) {
      el.currentTime = playback.currentTime;
    }

    if (playback.isPlaying && el.paused) {
      el.play().catch(() => {
        // автоплей може бути заблокований браузером - користувач
        // натисне play вручну, після чого підхопиться sync
      });
    } else if (!playback.isPlaying && !el.paused) {
      el.pause();
    }
  }, [isHtml5, playback]);

  // --- YouTube IFrame API ---
  const isYouTube = video?.type === "youtube";

  useEffect(() => {
    if (!isYouTube) return;

    function createPlayer() {
      const videoIdMatch = video.url.match(/embed\/([^?]+)/);
      const videoId = videoIdMatch?.[1];
      if (!videoId) return;

      ytPlayerRef.current = new window.YT.Player("yt-player", {
        videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            if (playback.isPlaying) {
              ytPlayerRef.current.seekTo(playback.currentTime, true);
              ytPlayerRef.current.playVideo();
            } else {
              ytPlayerRef.current.seekTo(playback.currentTime, true);
            }
          },
          onStateChange: (e) => {
            if (!isHost || !ytReadyRef.current) return;
            const t = ytPlayerRef.current.getCurrentTime();
            if (e.data === window.YT.PlayerState.PLAYING) {
              onSync(t, true);
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              onSync(t, false);
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      ytPlayerRef.current?.destroy?.();
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, video?.url]);

  // Застосовуємо playback update до YouTube
  useEffect(() => {
    if (!isYouTube || !ytReadyRef.current) return;
    if (playback.updatedAt === lastAppliedUpdateRef.current) return;

    const player = ytPlayerRef.current;
    if (!player) return;

    lastAppliedUpdateRef.current = playback.updatedAt;

    const current = player.getCurrentTime();
    const drift = Math.abs(current - playback.currentTime);
    if (drift > DRIFT_TOLERANCE) {
      player.seekTo(playback.currentTime, true);
    }

    if (playback.isPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [isYouTube, playback]);

  if (!video?.url) {
    return (
      <div className="aspect-video w-full rounded-blob bg-panel flex items-center justify-center text-mist font-display text-lg px-6 text-center">
        Хост ще не вибрав відео 🍌
      </div>
    );
  }

  if (isYouTube) {
    return (
      <div className="aspect-video w-full rounded-blob overflow-hidden bg-black">
        <div id="yt-player" className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-blob overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        className="w-full h-full"
      />
    </div>
  );
}
