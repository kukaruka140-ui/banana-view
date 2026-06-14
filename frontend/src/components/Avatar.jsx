/**
 * Аватарка користувача: фото, якщо є, інакше кольоровий круг
 * з першою літерою імені.
 */
export default function Avatar({ name, avatarUrl, size = 28 }) {
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      style={style}
      className="rounded-full bg-grape flex items-center justify-center font-display font-semibold text-cream shrink-0"
    >
      <span style={{ fontSize: size * 0.45 }}>{initial}</span>
    </div>
  );
}
