export default function StatCard({ label, value, helper, icon }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <h3 className="mt-3 text-3xl font-black text-ink-900">{value}</h3>
          {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">{icon}</div>
      </div>
    </div>
  );
}
