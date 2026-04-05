import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { formatDate } from "../utils/format";

const initialForm = {
  registrationNumber: "",
  nameEn: "",
  nameAr: "",
  ownerName: "",
  commercialActivity: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  status: "ACTIVE"
};

export default function CompaniesPage() {
  const { token, hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const canManage = hasPermission("company:manage");

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

  useEffect(() => {
    loadCompanies();
  }, [deferredSearch, statusFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      pending: items.filter((item) => item.status === "PENDING").length
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
      ownerName: item.ownerName || "",
      commercialActivity: item.commercialActivity || "",
      email: item.email || "",
      phone: item.phone || "",
      address: item.address || "",
      city: item.city || "",
      status: item.status || "ACTIVE"
    });
    setModalOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Company registry</h1>
          <p className="page-subtitle">Maintain the official record of registered companies and their commercial profile data.</p>
        </div>

        {canManage ? (
          <button type="button" onClick={openCreate} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">Add company</span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="page-card">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total companies</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.total}</h2>
        </div>
        <div className="page-card">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Active</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.active}</h2>
        </div>
        <div className="page-card">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Pending review</p>
          <h2 className="mt-3 text-3xl font-black text-ink-900">{stats.pending}</h2>
        </div>
      </div>

      <section className="page-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="field pl-11"
              placeholder="Search by name, owner, or registration number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="field w-full max-w-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Registration</th>
                <th>Owner</th>
                <th>City</th>
                <th>Status</th>
                <th>Latest license</th>
                <th>Created</th>
                {canManage ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-bold text-ink-900">{item.nameEn}</div>
                    <div className="text-xs text-slate-500">{item.commercialActivity || "-"}</div>
                  </td>
                  <td>{item.registrationNumber}</td>
                  <td>{item.ownerName}</td>
                  <td>{item.city || "-"}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{item.licenses[0]?.licenseNumber ?? "No license yet"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  {canManage ? (
                    <td>
                      <button type="button" onClick={() => openEdit(item)} className="secondary-btn !px-3 !py-2">
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && items.length === 0 ? (
            <div className="rounded-[24px] bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              No companies found for the selected filters.
            </div>
          ) : null}
        </div>
      </section>

      <Modal title={editing ? "Edit company" : "Register company"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {[
            ["registrationNumber", "Registration number (optional)"],
            ["nameEn", "Company name (EN)"],
            ["nameAr", "Company name (AR)"],
            ["ownerName", "Owner name"],
            ["commercialActivity", "Commercial activity"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["city", "City"]
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
            <span className="mb-2 block text-sm font-semibold text-slate-700">Address</span>
            <textarea
              className="field min-h-28"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
            <select className="field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="secondary-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              {editing ? "Update company" : "Create company"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
