/**
 * Узагальнена нижня панель (bottom sheet) з заголовком та контентом.
 * Закривається тапом на фон або кнопку ✕.
 */
export default function BottomSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative bg-panel rounded-t-blob px-4 pt-4 pb-6 max-h-[80vh] overflow-y-auto scrollbar-thin animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-panel2 rounded-full mx-auto mb-4" />

        {title && (
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-banana text-lg">{title}</p>
            <button onClick={onClose} className="text-mist text-xl px-2">
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
