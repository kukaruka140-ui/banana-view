/**
 * Накладка з плаваючими емоджі-реакціями.
 * Кожна реакція з'являється внизу екрана, спливає вгору і зникає
 * (анімація floatUp з tailwind.config.js).
 *
 * Горизонтальна позиція - псевдовипадкова на основі id, щоб
 * реакції не накладались одна на одну ідеально по центру.
 */
export default function ReactionsOverlay({ reactions }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {reactions.map((r) => {
        // детермінований "випадковий" зсув по id
        const hash = hashString(r.id);
        const left = 8 + (hash % 84); // 8% - 92%
        const delay = (hash % 5) * 40; // невеликий розкид по часу

        return (
          <span
            key={r.id}
            className="absolute bottom-16 text-3xl animate-floatUp select-none"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}ms`,
            }}
          >
            {r.emoji}
          </span>
        );
      })}
    </div>
  );
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}
