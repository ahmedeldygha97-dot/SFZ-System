export function formatCurrency(value, currency = "LYD") {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function toInputDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().split("T")[0];
}

export function statusTone(status) {
  const tone = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    EXPIRED: "bg-rose-100 text-rose-800 border-rose-200",
    PENDING_RENEWAL: "bg-amber-100 text-amber-800 border-amber-200",
    SUSPENDED: "bg-slate-100 text-slate-800 border-slate-200",
    REVOKED: "bg-rose-100 text-rose-800 border-rose-200",
    DRAFT: "bg-brand-100 text-brand-800 border-brand-200",
    PENDING: "bg-brand-100 text-brand-800 border-brand-200",
    CLOSED: "bg-slate-200 text-slate-700 border-slate-300"
  };

  return tone[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
}
