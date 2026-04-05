import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, PieChart, TrendingUp } from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { formatCurrency, formatDate } from "../utils/format";

export default function ReportsPage() {
  const { token, hasPermission } = useAuth();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    expiringDays: 45
  });
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        expiringDays: String(filters.expiringDays)
      });

      const payload = await apiRequest(`/reports/analytics?${params.toString()}`, { token });
      setData(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, [filters.from, filters.to, filters.expiringDays]);

  const maxRevenue = useMemo(
    () => Math.max(...(data?.monthlyRevenue?.map((item) => item.value) || [1])),
    [data]
  );
  const maxBreakdown = useMemo(
    () => Math.max(...(data?.statusBreakdown?.map((item) => item.value) || [1])),
    [data]
  );

  if (!hasPermission("report:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">You do not have access to reports.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports and analytics</h1>
        <p className="page-subtitle">Revenue, portfolio status, expiring licenses, and top-performing accounts across the selected window.</p>
      </div>

      <section className="page-card">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">From</span>
            <input className="field" type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">To</span>
            <input className="field" type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Expiring within days</span>
            <input className="field" type="number" value={filters.expiringDays} onChange={(event) => setFilters((prev) => ({ ...prev, expiringDays: Number(event.target.value) }))} />
          </label>
        </div>
      </section>

      {error ? <div className="page-card text-sm font-semibold text-rose-700">{error}</div> : null}

      {!data ? (
        <div className="page-card text-sm font-semibold text-slate-500">Loading analytics...</div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="page-card">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">Monthly revenue</h2>
              </div>
              <div className="mt-6 space-y-4">
                {data.monthlyRevenue.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>{item.label}</span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-brand-500" style={{ width: `${(item.value / maxRevenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-card">
              <div className="flex items-center gap-3">
                <PieChart className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">License status mix</h2>
              </div>
              <div className="mt-6 space-y-4">
                {data.statusBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-accent" style={{ width: `${(item.value / maxBreakdown) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="page-card">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">Payment methods</h2>
              </div>
              <div className="mt-6 space-y-3">
                {data.paymentMethodBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>{item.label}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-card">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">Top companies by collections</h2>
              </div>
              <div className="mt-6 space-y-3">
                {data.topCompanies.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>{item.label}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="page-card">
            <div className="flex items-center gap-3">
              <CalendarClock className="text-brand-700" />
              <h2 className="text-xl font-black text-ink-900">Expiring licenses</h2>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>License</th>
                    <th>Company</th>
                    <th>Expiry date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.expiringLicenses.map((license) => (
                    <tr key={license.id}>
                      <td className="font-semibold text-ink-900">{license.licenseNumber}</td>
                      <td>{license.company.nameEn}</td>
                      <td>{formatDate(license.expiryDate)}</td>
                      <td>
                        <StatusBadge status={license.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
