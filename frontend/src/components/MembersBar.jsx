/**
 * Горизонтальний список учасників з аватарками-плейсхолдерами
 * (перша літера імені) та бейджем хоста.
 */
import Avatar from "./Avatar";

export default function MembersBar({ members }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin px-4 py-2">
      {members.map((m) => (
        <div
          key={m.userId}
          className="flex items-center gap-1.5 bg-panel2 rounded-full pl-1 pr-3 py-1 shrink-0"
          title={m.name}
        >
          <Avatar name={m.name} avatarUrl={m.avatarUrl} size={24} />
          <span className="text-xs text-cream max-w-[80px] truncate">{m.name}</span>
          {m.isHost && (
            <span className="text-[10px] bg-banana text-ink font-display font-semibold rounded-full px-1.5 py-0.5">
              host
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
