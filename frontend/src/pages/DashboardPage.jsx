import { useEffect, useState } from "react";
import { ArchiveRestore, BadgeDollarSign, Building2, Clock3, FileText, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, formatDate } from "../utils/format";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/dashboard/summary", { token })
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) {
    return <div className="page-card text-sm font-semibold text-rose-700">{error}</div>;
  }

  if (!data) {
    return <div className="page-card text-sm font-semibold text-slate-500">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t("dashboard.title")}</h1>
        <p className="page-subtitle">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label={t("dashboard.stats.companies")} value={data.stats.companies} icon={<Building2 size={22} />} />
        <StatCard label={t("dashboard.stats.activeLicenses")} value={data.stats.activeLicenses} icon={<FileText size={22} />} />
        <StatCard label={t("dashboard.stats.expiredLicenses")} value={data.stats.expiredLicenses} icon={<Clock3 size={22} />} />
        <StatCard label={t("dashboard.stats.expiringSoon")} value={data.stats.expiringSoon} icon={<History size={22} />} />
        <StatCard label={t("dashboard.stats.monthlyRevenue")} value={formatCurrency(data.stats.monthlyRevenue)} icon={<BadgeDollarSign size={22} />} />
        <StatCard
          label={t("dashboard.stats.lastBackup")}
          value={data.stats.lastBackupAt ? formatDate(data.stats.lastBackupAt) : "-"}
          icon={<ArchiveRestore size={22} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">{t("dashboard.recentCompanies")}</h2>
          <div className="mt-5 space-y-3">
            {data.recentCompanies.map((company) => (
              <div key={company.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{company.nameAr || company.nameEn}</h3>
                    <p className="mt-1 text-sm text-slate-500">{company.registrationNumber}</p>
                  </div>
                  <StatusBadge status={company.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{company.managerName || company.ownerName}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">{t("dashboard.recentLicenses")}</h2>
          <div className="mt-5 space-y-3">
            {data.recentLicenses.map((license) => (
              <div key={license.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{license.licenseNumber}</h3>
                    <p className="mt-1 text-sm text-slate-500">{license.company.nameAr || license.company.nameEn}</p>
                  </div>
                  <StatusBadge status={license.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{formatDate(license.expiryDate)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">{t("dashboard.recentPayments")}</h2>
          <div className="mt-5 space-y-3">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{payment.company.nameAr || payment.company.nameEn}</h3>
                    <p className="mt-1 text-sm text-slate-500">{payment.receiptNumber || payment.license?.licenseNumber || "-"}</p>
                  </div>
                  <span className="text-sm font-black text-brand-700">{formatCurrency(payment.amount)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{formatDate(payment.paymentDate)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">{t("dashboard.recentActivity")}</h2>
          <div className="mt-5 space-y-3">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{item.userName || "-"}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.action}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
