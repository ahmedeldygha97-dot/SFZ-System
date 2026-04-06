import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Download, Eye, Plus, Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { apiRequest, downloadFile } from "../api/client";
import { attachmentCategoryLabel, formatDate, statusLabel } from "../utils/format";
import { readFileAsBase64 } from "../utils/file";

const initialForm = {
  registrationNumber: "",
  nameEn: "",
  nameAr: "",
  tradeName: "",
  legalForm: "",
  ownerName: "",
  managerName: "",
  nationality: "",
  commercialActivity: "",
  email: "",
  phone: "",
  address: "",
  areaName: "",
  buildingName: "",
  premisesNumber: "",
  city: "",
  notes: "",
  status: "ACTIVE"
};

export default function CompaniesPage() {
  const { t } = useTranslation();
  const { token, hasPermission } = useAuth();
  const { language } = useSystem();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [attachmentCategory, setAttachmentCategory] = useState("REGISTRATION");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const canManage = hasPermission("company:manage");
  const canExport = hasPermission("company:export");
  const canUpload = hasPermission("attachment:manage");

  async function loadCompanies() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (deferredSearch) params.set("search", deferredSearch);
      if (statusFilter) params.set("status", statusFilter);
      const payload = await apiRequest(`/companies?${params.toString()}`, { token });
      setItems(payload.items);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanyDetails(id) {
    try {
      const payload = await apiRequest(`/companies/${id}`, { token });
      setSelectedCompany(payload.item);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, [deferredSearch, statusFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      suspended: items.filter((item) => item.status === "SUSPENDED").length
    }),
    [items]
  );

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      registrationNumber: item.registrationNumber || "",
      nameEn: item.nameEn || "",
      nameAr: item.nameAr || "",
      tradeName: item.tradeName || "",
      legalForm: item.legalForm || "",
      ownerName: item.ownerName || "",
      managerName: item.managerName || "",
      nationality: item.nationality || "",
      commercialActivity: item.commercialActivity || "",
      email: item.email || "",
      phone: item.phone || "",
      address: item.address || "",
      areaName: item.areaName || "",
      buildingName: item.buildingName || "",
      premisesNumber: item.premisesNumber || "",
      city: item.city || "",
      notes: item.notes || "",
      status: item.status || "ACTIVE"
    });
    setModalOpen(true);
  }

  async function openDetails(item) {
    setDetailOpen(true);
    setSelectedCompany(null);
    await loadCompanyDetails(item.id);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      if (editing) {
        await apiRequest(`/companies/${editing.id}`, {
          method: "PATCH",
          token,
          body: form
        });
      } else {
        await apiRequest("/companies", {
          method: "POST",
          token,
          body: form
        });
      }

      setModalOpen(false);
      setForm(initialForm);
      setEditing(null);
      loadCompanies();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadCompanyPdf(company) {
    try {
      const blob = await downloadFile(`/companies/${company.id}/pdf?lang=${language}`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${company.registrationNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  async function uploadAttachment(file) {
    if (!file || !selectedCompany) {
      return;
    }

    try {
      const contentBase64 = await readFileAsBase64(file);
      await apiRequest("/attachments", {
        method: "POST",
        token,
        body: {
          entityType: "COMPANY",
          companyId: selectedCompany.id,
          category: attachmentCategory,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64
        }
      });
      await loadCompanyDetails(selectedCompany.id);
      await loadCompanies();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{t("companies.title")}</h1>
          <p className="page-subtitle">{t("companies.subtitle")}</p>
        </div>

        {canManage ? (
          <button type="button" onClick={openCreate} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">{t("companies.addCompany")}</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="page-card">
          <p className="text-sm text-slate-400">{t("dashboard.stats.companies")}</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.total}</h2>
        </div>
        <div className="page-card">
          <p className="text-sm text-slate-400">{t("statuses.ACTIVE")}</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.active}</h2>
        </div>
        <div className="page-card">
          <p className="text-sm text-slate-400">{t("statuses.SUSPENDED")}</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.suspended}</h2>
        </div>
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
            {["ACTIVE", "PENDING", "SUSPENDED", "CLOSED"].map((status) => (
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
                <th>{t("common.company")}</th>
                <th>{t("companies.fields.registrationNumber")}</th>
                <th>{t("companies.fields.tradeName")}</th>
                <th>{t("companies.fields.managerName")}</th>
                <th>{t("companies.fields.city")}</th>
                <th>{t("common.status")}</th>
                <th>{t("companies.files")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-bold text-ink-900">{item.nameAr || item.nameEn}</div>
                    <div className="text-xs text-slate-500">{item.legalForm || item.commercialActivity || "-"}</div>
                  </td>
                  <td>{item.registrationNumber}</td>
                  <td>{item.tradeName || "-"}</td>
                  <td>{item.managerName || item.ownerName}</td>
                  <td>{item.city || "-"}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{item._count?.attachments ?? 0}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openDetails(item)} className="secondary-btn !px-3 !py-2">
                        <Eye size={15} />
                      </button>
                      {canExport ? (
                        <button type="button" onClick={() => downloadCompanyPdf(item)} className="secondary-btn !px-3 !py-2">
                          <Download size={15} />
                        </button>
                      ) : null}
                      {canManage ? (
                        <button type="button" onClick={() => openEdit(item)} className="secondary-btn !px-3 !py-2">
                          {t("common.edit")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && items.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              {t("companies.noResults")}
            </div>
          ) : null}
        </div>
      </section>

      <Modal title={editing ? t("companies.editCompany") : t("companies.addCompany")} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {[
            ["registrationNumber", t("companies.fields.registrationNumber")],
            ["nameAr", t("companies.fields.nameAr")],
            ["nameEn", t("companies.fields.nameEn")],
            ["tradeName", t("companies.fields.tradeName")],
            ["legalForm", t("companies.fields.legalForm")],
            ["managerName", t("companies.fields.managerName")],
            ["ownerName", t("companies.fields.ownerName")],
            ["nationality", t("companies.fields.nationality")],
            ["commercialActivity", t("companies.fields.activity")],
            ["email", t("companies.fields.email")],
            ["phone", t("companies.fields.phone")],
            ["city", t("companies.fields.city")],
            ["areaName", t("companies.fields.areaName")],
            ["buildingName", t("companies.fields.buildingName")],
            ["premisesNumber", t("companies.fields.premisesNumber")]
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
              <input
                className="field"
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
              />
            </label>
          ))}

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("companies.fields.address")}</span>
            <textarea
              className="field min-h-28"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("companies.fields.notes")}</span>
            <textarea
              className="field min-h-24"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.status")}</span>
            <select className="field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {["ACTIVE", "PENDING", "SUSPENDED", "CLOSED"].map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="secondary-btn">
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-btn">
              {editing ? t("common.update") : t("common.create")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={t("companies.companyDetails")} open={detailOpen} onClose={() => setDetailOpen(false)} width="max-w-5xl">
        {!selectedCompany ? (
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                [t("companies.fields.registrationNumber"), selectedCompany.registrationNumber],
                [t("companies.fields.tradeName"), selectedCompany.tradeName || "-"],
                [t("companies.fields.legalForm"), selectedCompany.legalForm || "-"],
                [t("companies.fields.managerName"), selectedCompany.managerName || selectedCompany.ownerName],
                [t("companies.fields.activity"), selectedCompany.commercialActivity || "-"],
                [t("companies.fields.city"), selectedCompany.city || "-"]
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
                    {["REGISTRATION", "IDENTITY", "CONTRACT", "ADDRESS", "OTHER"].map((category) => (
                      <option key={category} value={category}>
                        {attachmentCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {canExport ? (
                <button type="button" onClick={() => downloadCompanyPdf(selectedCompany)} className="secondary-btn">
                  <Download size={16} />
                  <span className="ms-2">{t("companies.downloadPdf")}</span>
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

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-ink-900">{t("companies.attachments")}</h3>
                <div className="mt-4 space-y-3">
                  {selectedCompany.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-ink-900">{attachment.originalName}</div>
                          <div className="mt-1 text-slate-500">{attachmentCategoryLabel(attachment.category)}</div>
                        </div>
                        <button type="button" onClick={() => downloadAttachment(attachment)} className="secondary-btn !px-3 !py-2">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedCompany.attachments.length === 0 ? <div className="text-sm text-slate-500">{t("companies.noAttachments")}</div> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-lg font-black text-ink-900">{t("companies.licenses")}</h3>
                <div className="mt-4 space-y-3">
                  {selectedCompany.licenses.map((license) => (
                    <div key={license.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-ink-900">{license.licenseNumber}</div>
                        <StatusBadge status={license.status} />
                      </div>
                      <div className="mt-1 text-slate-500">{formatDate(license.expiryDate)}</div>
                    </div>
                  ))}
                  {selectedCompany.licenses.length === 0 ? <div className="text-sm text-slate-500">{t("companies.noLicenses")}</div> : null}
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
