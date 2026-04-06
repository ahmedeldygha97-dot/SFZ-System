import i18n from "../i18n";

export function formatCurrency(value, currency = "LYD") {
  const language = i18n.language === "en" ? "en" : "ar";
  return new Intl.NumberFormat(language === "ar" ? "ar-LY" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0)) + ` ${currency}`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const language = i18n.language === "en" ? "en" : "ar";

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-GB", {
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

export function statusLabel(status) {
  return i18n.t(`statuses.${status}`, { defaultValue: status?.replaceAll("_", " ") ?? "-" });
}

export function roleLabel(role) {
  return i18n.t(`roles.${role}`, { defaultValue: role ?? "-" });
}

export function paymentMethodLabel(method) {
  return i18n.t(`paymentMethods.${method}`, { defaultValue: method ?? "-" });
}

export function attachmentCategoryLabel(category) {
  return i18n.t(`attachments.categories.${category}`, { defaultValue: category ?? "-" });
}

export function statusTone(status) {
  const tone = {
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    EXPIRED: "bg-rose-100 text-rose-800 border-rose-200",
    EXPIRING_SOON: "bg-amber-100 text-amber-800 border-amber-200",
    SUSPENDED: "bg-slate-100 text-slate-800 border-slate-200",
    REVOKED: "bg-rose-100 text-rose-800 border-rose-200",
    DRAFT: "bg-brand-100 text-brand-800 border-brand-200",
    PENDING: "bg-brand-100 text-brand-800 border-brand-200",
    CLOSED: "bg-slate-200 text-slate-700 border-slate-300",
    SUCCESS: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
    FAILED: "bg-rose-100 text-rose-800 border-rose-200",
    REFUNDED: "bg-slate-100 text-slate-800 border-slate-200"
  };

  return tone[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
}
