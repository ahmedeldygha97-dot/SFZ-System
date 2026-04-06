import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Download, PieChart, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { apiRequest, downloadFile } from "../api/client";
import { formatCurrency, formatDate, paymentMethodLabel, statusLabel } from "../utils/format";

export default function ReportsPage() {
  const { t } = useTranslation();
  const { token, hasPermission } = useAuth();
  const { language } = useSystem();
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
    expiringDays: 45,
    companyId: "",
    status: ""
  });
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        expiringDays: String(filters.expiringDays)
      });
      if (filters.companyId) params.set("companyId", filters.companyId);
      if (filters.status) params.set("status", filters.status);

      const [payload, companiesPayload] = await Promise.all([
        apiRequest(`/reports/analytics?${params.toString()}`, { token }),
        apiRequest("/companies", { token })
      ]);
      setData(payload);
      setCompanies(companiesPayload.items);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadReports();
  }, [filters.from, filters.to, filters.expiringDays, filters.companyId, filters.status]);

  const maxRevenue = useMemo(
    () => Math.max(...(data?.monthlyRevenue?.map((item) => item.value) || [1])),
    [data]
  );
  const maxBreakdown = useMemo(
    () => Math.max(...(data?.statusBreakdown?.map((item) => item.value) || [1])),
    [data]
  );

  async function exportPdf() {
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        expiringDays: String(filters.expiringDays)
      });
      if (filters.companyId) params.set("companyId", filters.companyId);
      if (filters.status) params.set("status", filters.status);
      params.set("lang", language);
      const blob = await downloadFile(`/reports/analytics/pdf?${params.toString()}`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "commercial-license-report.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!hasPermission("report:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">{t("common.accessDenied")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{t("reports.title")}</h1>
          <p className="page-subtitle">{t("reports.subtitle")}</p>
        </div>

        {hasPermission("report:export") ? (
          <button type="button" onClick={exportPdf} className="primary-btn">
            <Download size={16} />
            <span className="ms-2">{t("reports.exportPdf")}</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.from")}</span>
            <input className="field" type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.to")}</span>
            <input className="field" type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("reports.expiringWithinDays")}</span>
            <input className="field" type="number" value={filters.expiringDays} onChange={(event) => setFilters((prev) => ({ ...prev, expiringDays: Number(event.target.value) }))} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("reports.filterCompany")}</span>
            <select className="field" value={filters.companyId} onChange={(event) => setFilters((prev) => ({ ...prev, companyId: event.target.value }))}>
              <option value="">{t("common.selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameAr || company.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("reports.filterStatus")}</span>
            <select className="field" value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">{t("common.allStatuses")}</option>
              {["ACTIVE", "EXPIRED", "EXPIRING_SOON", "SUSPENDED", "REVOKED", "DRAFT"].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="page-card text-sm font-semibold text-rose-700">{error}</div> : null}

      {!data ? (
        <div className="page-card text-sm font-semibold text-slate-500">{t("common.loading")}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="page-card">
              <p className="text-sm text-slate-500">{t("reports.totalCompanies")}</p>
              <h2 className="mt-3 text-3xl font-black text-ink-900">{data.summary.totalCompanies}</h2>
            </div>
            <div className="page-card">
              <p className="text-sm text-slate-500">{t("reports.totalLicenses")}</p>
              <h2 className="mt-3 text-3xl font-black text-ink-900">{data.summary.totalLicenses}</h2>
            </div>
            <div className="page-card">
              <p className="text-sm text-slate-500">{t("reports.paidLicenses")}</p>
              <h2 className="mt-3 text-3xl font-black text-ink-900">{data.summary.paidCount}</h2>
            </div>
            <div className="page-card">
              <p className="text-sm text-slate-500">{t("reports.revenue")}</p>
              <h2 className="mt-3 text-3xl font-black text-ink-900">{formatCurrency(data.summary.revenue)}</h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="page-card">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">{t("reports.monthlyRevenue")}</h2>
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
                <h2 className="text-xl font-black text-ink-900">{t("reports.statusMix")}</h2>
              </div>
              <div className="mt-6 space-y-4">
                {data.statusBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-600">
                      <span>{statusLabel(item.label)}</span>
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
                <h2 className="text-xl font-black text-ink-900">{t("reports.paymentMethods")}</h2>
              </div>
              <div className="mt-6 space-y-3">
                {data.paymentMethodBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>{paymentMethodLabel(item.label)}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="page-card">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand-700" />
                <h2 className="text-xl font-black text-ink-900">{t("reports.topCompanies")}</h2>
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
              <BarChart3 className="text-brand-700" />
              <h2 className="text-xl font-black text-ink-900">{t("reports.activitySummary")}</h2>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.activitySummary.map((item) => (
                <div key={item.label} className="rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  <div>{item.label}</div>
                  <div className="mt-2 text-2xl font-black text-ink-900">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="page-card">
            <div className="flex items-center gap-3">
              <CalendarClock className="text-brand-700" />
              <h2 className="text-xl font-black text-ink-900">{t("reports.expiringLicenses")}</h2>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("common.license")}</th>
                    <th>{t("common.company")}</th>
                    <th>{t("licenses.expiryDate")}</th>
                    <th>{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.expiringLicenses.map((license) => (
                    <tr key={license.id}>
                      <td className="font-semibold text-ink-900">{license.licenseNumber}</td>
                      <td>{license.company.nameAr || license.company.nameEn}</td>
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
