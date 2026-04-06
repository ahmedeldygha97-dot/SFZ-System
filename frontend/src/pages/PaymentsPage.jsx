import { useDeferredValue, useEffect, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { apiRequest, downloadFile } from "../api/client";
import { formatCurrency, formatDate, paymentMethodLabel } from "../utils/format";

const initialForm = {
  companyId: "",
  licenseId: "",
  amount: "",
  currency: "LYD",
  method: "CASH",
  status: "PAID",
  reference: "",
  notes: "",
  paymentDate: new Date().toISOString().split("T")[0]
};

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { token, hasPermission } = useAuth();
  const { language } = useSystem();
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  const canManage = hasPermission("payment:manage");
  const canExport = hasPermission("payment:export");
  const relatedLicenses = licenses.filter((license) => license.companyId === form.companyId);

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (deferredSearch) params.set("search", deferredSearch);
      if (statusFilter) params.set("status", statusFilter);

      const [paymentsPayload, companiesPayload, licensesPayload] = await Promise.all([
        apiRequest(`/payments?${params.toString()}`, { token }),
        apiRequest("/companies", { token }),
        apiRequest("/licenses", { token })
      ]);

      setPayments(paymentsPayload.items);
      setCompanies(companiesPayload.items);
      setLicenses(licensesPayload.items);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [deferredSearch, statusFilter]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/payments", {
        method: "POST",
        token,
        body: {
          ...form,
          licenseId: form.licenseId || null
        }
      });

      setModalOpen(false);
      setForm(initialForm);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadReceipt(payment) {
    try {
      const blob = await downloadFile(`/payments/${payment.id}/receipt?lang=${language}`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${payment.receiptNumber || payment.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{t("payments.title")}</h1>
          <p className="page-subtitle">{t("payments.subtitle")}</p>
        </div>

        {canManage ? (
          <button type="button" onClick={() => setModalOpen(true)} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">{t("payments.recordPayment")}</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="field pl-11" placeholder={t("common.search")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <select className="field w-full max-w-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t("common.allStatuses")}</option>
            <option value="PAID">{t("statuses.PAID")}</option>
            <option value="FAILED">{t("statuses.FAILED")}</option>
            <option value="REFUNDED">{t("statuses.REFUNDED")}</option>
          </select>
        </div>

        {error ? <div className="my-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("payments.receiptNumber")}</th>
                <th>{t("common.company")}</th>
                <th>{t("common.license")}</th>
                <th>{t("payments.amount")}</th>
                <th>{t("payments.method")}</th>
                <th>{t("common.status")}</th>
                <th>{t("payments.paymentDate")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-semibold text-ink-900">{payment.receiptNumber || "-"}</td>
                  <td>{payment.company.nameAr || payment.company.nameEn}</td>
                  <td>{payment.license?.licenseNumber ?? "-"}</td>
                  <td>{formatCurrency(payment.amount, payment.currency)}</td>
                  <td>{paymentMethodLabel(payment.method)}</td>
                  <td>
                    <StatusBadge status={payment.status} />
                  </td>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>
                    {canExport ? (
                      <button type="button" onClick={() => downloadReceipt(payment)} className="secondary-btn !px-3 !py-2">
                        <Download size={15} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title={t("payments.recordPayment")} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.company")}</span>
            <select className="field" value={form.companyId} onChange={(event) => setForm((prev) => ({ ...prev, companyId: event.target.value, licenseId: "" }))} required>
              <option value="">{t("payments.selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameAr || company.nameEn}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.license")}</span>
            <select className="field" value={form.licenseId} onChange={(event) => setForm((prev) => ({ ...prev, licenseId: event.target.value }))}>
              <option value="">{t("payments.generalPayment")}</option>
              {relatedLicenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {license.licenseNumber}
                </option>
              ))}
            </select>
          </label>

          {[
            ["amount", t("payments.amount"), "number"],
            ["reference", t("payments.reference"), "text"],
            ["paymentDate", t("payments.paymentDate"), "date"]
          ].map(([field, label, type]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              <input className="field" type={type} value={form[field]} onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))} required={field !== "reference"} />
            </label>
          ))}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("payments.method")}</span>
            <select className="field" value={form.method} onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.status")}</span>
            <select className="field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {["PAID", "FAILED", "REFUNDED"].map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.notes")}</span>
            <textarea className="field min-h-28" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="secondary-btn">
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-btn">
              {t("common.save")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
