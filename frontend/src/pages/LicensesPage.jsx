import { useDeferredValue, useEffect, useState } from "react";
import { Download, ExternalLink, Eye, PauseCircle, PlayCircle, Plus, RefreshCw, Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { apiRequest, downloadFile } from "../api/client";
import { attachmentCategoryLabel, formatCurrency, formatDate, paymentMethodLabel, statusLabel, toInputDate } from "../utils/format";
import { readFileAsBase64 } from "../utils/file";

const initialIssueForm = {
  companyId: "",
  issueDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  durationMonths: 12,
  issuingAuthority: "",
  activities: "",
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
  const { t } = useTranslation();
  const { token, hasPermission } = useAuth();
  const { language } = useSystem();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [issueForm, setIssueForm] = useState(initialIssueForm);
  const [renewForm, setRenewForm] = useState(initialRenewForm);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [attachmentCategory, setAttachmentCategory] = useState("LICENSE");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  const canManage = hasPermission("license:manage");
  const canExport = hasPermission("license:export");
  const canStatus = hasPermission("license:status-manage");
  const canUpload = hasPermission("attachment:manage");

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

  async function loadLicense(id) {
    try {
      const payload = await apiRequest(`/licenses/${id}`, { token });
      setSelectedLicense(payload.item);
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
      if (editing) {
        await apiRequest(`/licenses/${editing.id}`, {
          method: "PATCH",
          token,
          body: issueForm
        });
      } else {
        await apiRequest("/licenses", {
          method: "POST",
          token,
          body: issueForm
        });
      }

      setIssueModalOpen(false);
      setIssueForm(initialIssueForm);
      setEditing(null);
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
      await loadLicense(selectedLicense.id);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDownload(license) {
    try {
      const blob = await downloadFile(`/licenses/${license.id}/pdf?lang=${language}`, token);
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

  async function handleStatusAction(license, action) {
    try {
      await apiRequest(`/licenses/${license.id}/${action}`, {
        method: "PATCH",
        token,
        body: {
          reason: action === "suspend" ? t("licenses.statusReasonSuspend") : t("licenses.statusReasonReactivate")
        }
      });
      if (selectedLicense?.id === license.id) {
        await loadLicense(license.id);
      }
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadAttachment(file) {
    if (!file || !selectedLicense) {
      return;
    }

    try {
      const contentBase64 = await readFileAsBase64(file);
      await apiRequest("/attachments", {
        method: "POST",
        token,
        body: {
          entityType: "LICENSE",
          licenseId: selectedLicense.id,
          category: attachmentCategory,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64
        }
      });
      await loadLicense(selectedLicense.id);
      loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadAttachment(attachment) {
    try {
      const blob = await downloadFile(`/attachments/${attachment.id}/download`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function openCreate() {
    setEditing(null);
    setIssueForm(initialIssueForm);
    setIssueModalOpen(true);
  }

  function openEdit(license) {
    setEditing(license);
    setIssueForm({
      companyId: license.companyId,
      issueDate: toInputDate(license.issueDate),
      expiryDate: toInputDate(license.expiryDate),
      durationMonths: license.durationMonths || 12,
      issuingAuthority: license.issuingAuthority || "",
      activities: license.activities || "",
      feeAmount: license.feeAmount || "",
      notes: license.notes || "",
      markAsPaid: false,
      paymentMethod: "CASH",
      paymentReference: ""
    });
    setIssueModalOpen(true);
  }

  async function openDetails(license) {
    setDetailOpen(true);
    setSelectedLicense(null);
    await loadLicense(license.id);
  }

  function openRenew(license) {
    setSelectedLicense(license);
    setRenewForm({
      ...initialRenewForm,
      newExpiryDate: toInputDate(license.expiryDate)
    });
    setRenewModalOpen(true);
  }

  if (!hasPermission("license:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">{t("common.accessDenied")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{t("licenses.title")}</h1>
          <p className="page-subtitle">{t("licenses.subtitle")}</p>
        </div>

        {canManage ? (
          <button type="button" onClick={openCreate} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">{t("licenses.issueLicense")}</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="field pl-11"
              placeholder={t("common.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="field w-full max-w-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t("common.allStatuses")}</option>
            {["ACTIVE", "EXPIRED", "EXPIRING_SOON", "SUSPENDED", "REVOKED", "DRAFT"].map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("common.license")}</th>
                <th>{t("common.company")}</th>
                <th>{t("licenses.issueDate")}</th>
                <th>{t("licenses.expiryDate")}</th>
                <th>{t("licenses.feeAmount")}</th>
                <th>{t("common.status")}</th>
                <th>{t("licenses.files")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((license) => (
                <tr key={license.id}>
                  <td>
                    <div className="font-bold text-ink-900">{license.licenseNumber}</div>
                    <div className="text-xs text-slate-500">{license.issuingAuthority || "-"}</div>
                  </td>
                  <td>{license.company.nameAr || license.company.nameEn}</td>
                  <td>{formatDate(license.issueDate)}</td>
                  <td>{formatDate(license.expiryDate)}</td>
                  <td>{formatCurrency(license.feeAmount)}</td>
                  <td>
                    <StatusBadge status={license.status} />
                  </td>
                  <td>{license._count?.attachments ?? 0}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openDetails(license)} className="secondary-btn !px-3 !py-2">
                        <Eye size={15} />
                      </button>
                      {canExport ? (
                        <button type="button" onClick={() => handleDownload(license)} className="secondary-btn !px-3 !py-2">
                          <Download size={15} />
                        </button>
                      ) : null}
                      <a href={`/verify/${license.publicId}`} target="_blank" rel="noreferrer" className="secondary-btn !px-3 !py-2">
                        <ExternalLink size={15} />
                      </a>
                      {canManage ? (
                        <>
                          <button type="button" onClick={() => openEdit(license)} className="secondary-btn !px-3 !py-2">
                            {t("common.edit")}
                          </button>
                          <button type="button" onClick={() => openRenew(license)} className="secondary-btn !px-3 !py-2">
                            <RefreshCw size={15} />
                          </button>
                        </>
                      ) : null}
                      {canStatus && license.status !== "SUSPENDED" ? (
                        <button type="button" onClick={() => handleStatusAction(license, "suspend")} className="secondary-btn !px-3 !py-2">
                          <PauseCircle size={15} />
                        </button>
                      ) : null}
                      {canStatus && license.status === "SUSPENDED" ? (
                        <button type="button" onClick={() => handleStatusAction(license, "reactivate")} className="secondary-btn !px-3 !py-2">
                          <PlayCircle size={15} />
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

      <Modal title={editing ? t("licenses.editLicense") : t("licenses.issueLicense")} open={issueModalOpen} onClose={() => setIssueModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleIssueSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.company")}</span>
            <select className="field" value={issueForm.companyId} onChange={(event) => setIssueForm((prev) => ({ ...prev, companyId: event.target.value }))} required>
              <option value="">{t("licenses.selectCompany")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameAr || company.nameEn}
                </option>
              ))}
            </select>
          </label>

          {[
            ["issueDate", t("licenses.issueDate"), "date"],
            ["expiryDate", t("licenses.expiryDate"), "date"],
            ["durationMonths", t("licenses.durationMonths"), "number"],
            ["feeAmount", t("licenses.feeAmount"), "number"],
            ["issuingAuthority", t("licenses.issuingAuthority"), "text"],
            ["activities", t("licenses.activities"), "text"],
            ["paymentReference", t("licenses.paymentReference"), "text"]
          ].map(([field, label, type]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              <input
                className="field"
                type={type}
                value={issueForm[field]}
                onChange={(event) => setIssueForm((prev) => ({ ...prev, [field]: event.target.value }))}
              />
            </label>
          ))}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("licenses.paymentMethod")}</span>
            <select className="field" value={issueForm.paymentMethod} onChange={(event) => setIssueForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.notes")}</span>
            <textarea className="field min-h-28" value={issueForm.notes} onChange={(event) => setIssueForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          {!editing ? (
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <input
                type="checkbox"
                checked={issueForm.markAsPaid}
                onChange={(event) => setIssueForm((prev) => ({ ...prev, markAsPaid: event.target.checked }))}
              />
              <span className="text-sm font-semibold text-slate-700">{t("licenses.recordPaymentNow")}</span>
            </label>
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setIssueModalOpen(false)} className="secondary-btn">
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-btn">
              {editing ? t("common.update") : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={t("licenses.viewLicense")} open={detailOpen} onClose={() => setDetailOpen(false)} width="max-w-6xl">
        {!selectedLicense ? (
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                [t("common.license"), selectedLicense.licenseNumber],
                [t("common.company"), selectedLicense.company.nameAr || selectedLicense.company.nameEn],
                [t("licenses.issueDate"), formatDate(selectedLicense.issueDate)],
                [t("licenses.expiryDate"), formatDate(selectedLicense.expiryDate)],
                [t("licenses.issuingAuthority"), selectedLicense.issuingAuthority || "-"],
                [t("licenses.activities"), selectedLicense.activities || "-"],
                [t("licenses.feeAmount"), formatCurrency(selectedLicense.feeAmount)],
                [t("common.status"), selectedLicense.status]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-400">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-ink-900">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {canUpload ? (
                <label className="block min-w-[220px]">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{t("companies.attachmentCategory")}</span>
                  <select className="field" value={attachmentCategory} onChange={(event) => setAttachmentCategory(event.target.value)}>
                    {["LICENSE", "IDENTITY", "CONTRACT", "ADDRESS", "OTHER"].map((category) => (
                      <option key={category} value={category}>
                        {attachmentCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {canExport ? (
                <button type="button" onClick={() => handleDownload(selectedLicense)} className="secondary-btn">
                  <Download size={16} />
                  <span className="ms-2">{t("common.download")}</span>
                </button>
              ) : null}
              {canUpload ? (
                <label className="secondary-btn cursor-pointer">
                  <Upload size={16} />
                  <span className="ms-2">{t("common.upload")}</span>
                  <input type="file" className="hidden" onChange={(event) => uploadAttachment(event.target.files?.[0])} />
                </label>
              ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-ink-900">{t("licenses.statusHistory")}</h3>
                <div className="mt-4 space-y-3">
                  {selectedLicense.statusHistory.map((row) => (
                    <div key={row.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={row.status} />
                        <span className="text-slate-500">{formatDate(row.changedAt)}</span>
                      </div>
                      <div className="mt-2 text-slate-600">{row.reason || "-"}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-ink-900">{t("licenses.renewalHistory")}</h3>
                <div className="mt-4 space-y-3">
                  {selectedLicense.renewals.map((row) => (
                    <div key={row.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <div className="font-semibold text-ink-900">{formatDate(row.newExpiryDate)}</div>
                      <div className="mt-1 text-slate-500">{formatCurrency(row.amount)}</div>
                    </div>
                  ))}
                  {selectedLicense.renewals.length === 0 ? <div className="text-sm text-slate-500">{t("licenses.noRenewals")}</div> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-ink-900">{t("licenses.attachments")}</h3>
                <div className="mt-4 space-y-3">
                  {selectedLicense.attachments.map((row) => (
                    <div key={row.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-ink-900">{row.originalName}</div>
                          <div className="mt-1 text-slate-500">{attachmentCategoryLabel(row.category)}</div>
                        </div>
                        <button type="button" onClick={() => downloadAttachment(row)} className="secondary-btn !px-3 !py-2">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedLicense.attachments.length === 0 ? <div className="text-sm text-slate-500">{t("licenses.noAttachments")}</div> : null}
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={t("licenses.renewLicense")} open={renewModalOpen} onClose={() => setRenewModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleRenewSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("licenses.expiryDate")}</span>
            <input className="field" type="date" value={renewForm.newExpiryDate} onChange={(event) => setRenewForm((prev) => ({ ...prev, newExpiryDate: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("licenses.feeAmount")}</span>
            <input className="field" type="number" step="0.01" value={renewForm.amount} onChange={(event) => setRenewForm((prev) => ({ ...prev, amount: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("licenses.paymentMethod")}</span>
            <select className="field" value={renewForm.paymentMethod} onChange={(event) => setRenewForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
              {["CASH", "BANK_TRANSFER", "CARD", "ONLINE", "CHEQUE", "OTHER"].map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("licenses.paymentReference")}</span>
            <input className="field" value={renewForm.paymentReference} onChange={(event) => setRenewForm((prev) => ({ ...prev, paymentReference: event.target.value }))} />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.notes")}</span>
            <textarea className="field min-h-28" value={renewForm.notes} onChange={(event) => setRenewForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={renewForm.markAsPaid}
              onChange={(event) => setRenewForm((prev) => ({ ...prev, markAsPaid: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-700">{t("licenses.recordPaymentNow")}</span>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setRenewModalOpen(false)} className="secondary-btn">
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
