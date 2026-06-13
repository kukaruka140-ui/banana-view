import { useEffect, useState } from "react";
import { useTelegram } from "./hooks/useTelegram";
import { useRoom } from "./hooks/useRoom";
import HomeScreen from "./screens/HomeScreen";
import RoomScreen from "./screens/RoomScreen";

export default function App() {
  const { tg, user, startParam, initData, haptic, isTelegram } = useTelegram();
  const room = useRoom();

  const [joined, setJoined] = useState(false);

  // Дефолтне ім'я з Telegram-профілю
  const defaultName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : "";

  const defaultAvatar = user?.photo_url || null;

  // Якщо прийшли по deep-link з кодом кімнати і ми в Telegram з відомим ім'ям -
  // одразу заходимо в кімнату без екрану Home
  useEffect(() => {
    if (joined) return;
    if (startParam && defaultName) {
      const userId = user?.id ? `tg-${user.id}` : `web-${Math.random().toString(36).slice(2, 10)}`;
      room.join({
        code: startParam.toUpperCase(),
        name: defaultName,
        avatarUrl: defaultAvatar,
        userId,
      });
      setJoined(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startParam, defaultName]);

  const handleEnter = ({ code, name, userId, avatarUrl }) => {
    room.join({ code, name, avatarUrl: avatarUrl || defaultAvatar, userId });
    setJoined(true);
  };

  const handleLeave = () => {
    // Найпростіший спосіб коректно "вийти" з кімнати -
    // перезавантажити сторінку, що закриє socket і скине стан
    window.location.href = window.location.pathname;
  };

  if (!joined) {
    return (
      <HomeScreen
        defaultName={defaultName}
        initialCode={startParam ? startParam.toUpperCase() : ""}
        initData={initData}
        onEnter={handleEnter}
        haptic={haptic}
      />
    );
  }

  return <RoomScreen room={room} tg={isTelegram ? tg : null} haptic={haptic} onLeave={handleLeave} />;
}
