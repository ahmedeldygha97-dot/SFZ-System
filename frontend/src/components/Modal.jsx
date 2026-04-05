export default function Modal({ title, open, onClose, children, width = "max-w-3xl" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`w-full ${width} rounded-[28px] bg-white p-6 shadow-panel`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
