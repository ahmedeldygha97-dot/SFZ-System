import { useEffect, useState } from "react";
import { BadgeDollarSign, Building2, Clock3, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, formatDate } from "../utils/format";

export default function DashboardPage() {
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
    return <div className="page-card text-sm font-semibold text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Operations overview</h1>
        <p className="page-subtitle">
          Live visibility across company registration, license health, collections, and recent regulatory activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Registered companies" value={data.stats.companies} icon={<Building2 size={22} />} />
        <StatCard label="Active licenses" value={data.stats.activeLicenses} icon={<FileText size={22} />} />
        <StatCard label="Pending renewal" value={data.stats.pendingRenewal} icon={<Clock3 size={22} />} />
        <StatCard label="Expiring in 30 days" value={data.stats.expiringSoon} icon={<ShieldCheck size={22} />} />
        <StatCard
          label="Collected this month"
          value={formatCurrency(data.stats.monthlyRevenue)}
          icon={<BadgeDollarSign size={22} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">Recent companies</h2>
          <div className="mt-5 space-y-3">
            {data.recentCompanies.map((company) => (
              <div key={company.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{company.nameEn}</h3>
                    <p className="mt-1 text-sm text-slate-500">{company.registrationNumber}</p>
                  </div>
                  <StatusBadge status={company.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">{company.ownerName}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">Latest licenses</h2>
          <div className="mt-5 space-y-3">
            {data.recentLicenses.map((license) => (
              <div key={license.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{license.licenseNumber}</h3>
                    <p className="mt-1 text-sm text-slate-500">{license.company.nameEn}</p>
                  </div>
                  <StatusBadge status={license.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">Expires {formatDate(license.expiryDate)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-card xl:col-span-1">
          <h2 className="text-xl font-black text-ink-900">Recent payments</h2>
          <div className="mt-5 space-y-3">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ink-900">{payment.company.nameEn}</h3>
                    <p className="mt-1 text-sm text-slate-500">{payment.license?.licenseNumber ?? "General payment"}</p>
                  </div>
                  <span className="text-sm font-black text-brand-700">{formatCurrency(payment.amount)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{formatDate(payment.paymentDate)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
