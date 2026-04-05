import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { formatCurrency, formatDate } from "../utils/format";

const initialForm = {
  companyId: "",
  licenseId: "",
  amount: "",
  currency: "LYD",
  method: "CASH",
  reference: "",
  notes: "",
  paymentDate: new Date().toISOString().split("T")[0]
};

export default function PaymentsPage() {
  const { token, hasPermission } = useAuth();
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const canManage = hasPermission("payment:manage");
  const relatedLicenses = licenses.filter((license) => license.companyId === form.companyId);

  async function loadData() {
    try {
      const [paymentsPayload, companiesPayload, licensesPayload] = await Promise.all([
        apiRequest("/payments", { token }),
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
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Payment collection</h1>
          <p className="page-subtitle">Track license fees, general company payments, and collection references in one ledger.</p>
        </div>

        {canManage ? (
          <button type="button" onClick={() => setModalOpen(true)} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">Record payment</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>License</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Recorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-semibold text-ink-900">{payment.company.nameEn}</td>
                  <td>{payment.license?.licenseNumber ?? "General payment"}</td>
                  <td>{formatCurrency(payment.amount, payment.currency)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.reference || "-"}</td>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>{payment.recordedBy?.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Record payment" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Company</span>
            <select
              className="field"
              value={form.companyId}
              onChange={(event) => setForm((prev) => ({ ...prev, companyId: event.target.value, licenseId: "" }))}
              required
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameEn}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Related license</span>
            <select
              className="field"
              value={form.licenseId}
              onChange={(event) => setForm((prev) => ({ ...prev, licenseId: event.target.value }))}
            >
              <option value="">General payment</option>
              {relatedLicenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {license.licenseNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Amount</span>
            <input className="field" type="number" step="0.01" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Method</span>
            <select className="field" value={form.method} onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Reference</span>
            <input className="field" value={form.reference} onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payment date</span>
            <input className="field" type="date" value={form.paymentDate} onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))} required />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
            <textarea className="field min-h-28" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="secondary-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Save payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
