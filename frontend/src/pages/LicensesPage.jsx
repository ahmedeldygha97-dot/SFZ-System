import { useDeferredValue, useEffect, useState } from "react";
import { Download, ExternalLink, Plus, RefreshCw, Search } from "lucide-react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { apiRequest, downloadFile } from "../api/client";
import { formatCurrency, formatDate } from "../utils/format";

const initialIssueForm = {
  companyId: "",
  issueDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  feeAmount: "",
  notes: "",
  markAsPaid: false,
  paymentMethod: "CASH",
  paymentReference: ""
};

const initialRenewForm = {
  newExpiryDate: "",
  amount: "",
  notes: "",
  markAsPaid: false,
  paymentMethod: "CASH",
  paymentReference: ""
};

export default function LicensesPage() {
  const { token, hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [renewForm, setRenewForm] = useState(initialRenewForm);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  const canManage = hasPermission("license:manage");

  async function loadData() {
    try {
      const params = new URLSearchParams();
      if (deferredSearch) params.set("search", deferredSearch);
      if (statusFilter) params.set("status", statusFilter);
      const [licensesPayload, companiesPayload] = await Promise.all([
        apiRequest(`/licenses?${params.toString()}`, { token }),
        apiRequest("/companies", { token })
      ]);

      setItems(licensesPayload.items);
      setCompanies(companiesPayload.items);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [deferredSearch, statusFilter]);

  async function handleIssueSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest("/licenses", {
        method: "POST",
        token,
        body: issueForm
      });

      setIssueModalOpen(false);
      setIssueForm(initialIssueForm);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleRenewSubmit(event) {
    event.preventDefault();

    try {
      await apiRequest(`/licenses/${selectedLicense.id}/renew`, {
        method: "PATCH",
        token,
        body: renewForm
      });

      setRenewModalOpen(false);
      setRenewForm(initialRenewForm);
      setSelectedLicense(null);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDownload(license) {
    try {
      const blob = await downloadFile(`/licenses/${license.id}/pdf`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${license.licenseNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  function openRenew(license) {
    setSelectedLicense(license);
    setRenewForm({
      ...initialRenewForm,
      newExpiryDate: license.expiryDate ? new Date(license.expiryDate).toISOString().split("T")[0] : ""
    });
    setRenewModalOpen(true);
  }

  if (!hasPermission("license:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">You do not have access to license management.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Commercial licenses</h1>
          <p className="page-subtitle">Issue, renew, and export digitally verifiable commercial licenses for registered companies.</p>
        </div>

        {canManage ? (
          <button type="button" onClick={() => setIssueModalOpen(true)} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">Issue license</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="field pl-11"
              placeholder="Search by license number or company"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="field w-full max-w-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {["ACTIVE", "EXPIRED", "PENDING_RENEWAL", "SUSPENDED", "REVOKED", "DRAFT"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>License</th>
                <th>Company</th>
                <th>Issue</th>
                <th>Expiry</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Renewals</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((license) => (
                <tr key={license.id}>
                  <td>
                    <div className="font-bold text-ink-900">{license.licenseNumber}</div>
                    <div className="text-xs text-slate-500">{license.company.registrationNumber}</div>
                  </td>
                  <td>{license.company.nameEn}</td>
                  <td>{formatDate(license.issueDate)}</td>
                  <td>{formatDate(license.expiryDate)}</td>
                  <td>{formatCurrency(license.feeAmount)}</td>
                  <td>
                    <StatusBadge status={license.status} />
                  </td>
                  <td>{license.renewals.length}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleDownload(license)} className="secondary-btn !px-3 !py-2">
                        <Download size={15} />
                      </button>
                      <a
                        href={`/verify/${license.publicId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-btn !px-3 !py-2"
                      >
                        <ExternalLink size={15} />
                      </a>
                      {canManage ? (
                        <button type="button" onClick={() => openRenew(license)} className="secondary-btn !px-3 !py-2">
                          <RefreshCw size={15} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Issue license" open={issueModalOpen} onClose={() => setIssueModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleIssueSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Company</span>
            <select className="field" value={issueForm.companyId} onChange={(event) => setIssueForm((prev) => ({ ...prev, companyId: event.target.value }))} required>
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameEn} ({company.registrationNumber})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Issue date</span>
            <input className="field" type="date" value={issueForm.issueDate} onChange={(event) => setIssueForm((prev) => ({ ...prev, issueDate: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Expiry date</span>
            <input className="field" type="date" value={issueForm.expiryDate} onChange={(event) => setIssueForm((prev) => ({ ...prev, expiryDate: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Fee amount</span>
            <input className="field" type="number" step="0.01" value={issueForm.feeAmount} onChange={(event) => setIssueForm((prev) => ({ ...prev, feeAmount: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payment method</span>
            <select className="field" value={issueForm.paymentMethod} onChange={(event) => setIssueForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
            <textarea className="field min-h-28" value={issueForm.notes} onChange={(event) => setIssueForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payment reference</span>
            <input className="field" value={issueForm.paymentReference} onChange={(event) => setIssueForm((prev) => ({ ...prev, paymentReference: event.target.value }))} />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={issueForm.markAsPaid}
              onChange={(event) => setIssueForm((prev) => ({ ...prev, markAsPaid: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-700">Record payment immediately</span>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIssueModalOpen(false)} className="secondary-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Issue license
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={`Renew ${selectedLicense?.licenseNumber ?? "license"}`} open={renewModalOpen} onClose={() => setRenewModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRenewSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">New expiry date</span>
            <input className="field" type="date" value={renewForm.newExpiryDate} onChange={(event) => setRenewForm((prev) => ({ ...prev, newExpiryDate: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Renewal fee</span>
            <input className="field" type="number" step="0.01" value={renewForm.amount} onChange={(event) => setRenewForm((prev) => ({ ...prev, amount: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payment method</span>
            <select className="field" value={renewForm.paymentMethod} onChange={(event) => setRenewForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Payment reference</span>
            <input className="field" value={renewForm.paymentReference} onChange={(event) => setRenewForm((prev) => ({ ...prev, paymentReference: event.target.value }))} />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
            <textarea className="field min-h-28" value={renewForm.notes} onChange={(event) => setRenewForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={renewForm.markAsPaid}
              onChange={(event) => setRenewForm((prev) => ({ ...prev, markAsPaid: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-700">Record payment immediately</span>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setRenewModalOpen(false)} className="secondary-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              Renew license
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
