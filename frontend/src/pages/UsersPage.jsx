import { useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { apiRequest } from "../api/client";
import { formatDate, roleLabel } from "../utils/format";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF",
  locale: "ar",
  isActive: true,
  customPermissions: []
};

export default function UsersPage() {
  const { t } = useTranslation();
  const { token, hasPermission } = useAuth();
  const { language } = useSystem();
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = hasPermission("user:manage");

  async function loadUsers() {
    try {
      const [usersPayload, settingsPayload] = await Promise.all([
        apiRequest("/users", { token }),
        apiRequest("/settings", { token })
      ]);
      setUsers(usersPayload.items);
      setPermissions(settingsPayload.permissions);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      locale: user.locale || "ar",
      isActive: user.isActive,
      customPermissions: user.customPermissions || []
    });
    setError("");
    setModalOpen(true);
  }

  function openResetPassword(user) {
    setResetTarget(user);
    setResetPassword("");
    setError("");
    setResetModalOpen(true);
  }

  function togglePermission(code) {
    setForm((prev) => ({
      ...prev,
      customPermissions: prev.customPermissions.includes(code)
        ? prev.customPermissions.filter((item) => item !== code)
        : [...prev.customPermissions, code]
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");

      if (editing) {
        const payload = { ...form };
        if (!payload.password) {
          delete payload.password;
        }

        await apiRequest(`/users/${editing.id}`, {
          method: "PATCH",
          token,
          body: payload
        });
      } else {
        await apiRequest("/users", {
          method: "POST",
          token,
          body: form
        });
      }

      setModalOpen(false);
      setEditing(null);
      setForm(initialForm);
      setSuccess(editing ? t("common.update") : t("common.create"));
      loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");
      await apiRequest(`/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        token,
        body: {
          newPassword: resetPassword
        }
      });
      setResetModalOpen(false);
      setResetTarget(null);
      setResetPassword("");
      setSuccess(t("users.passwordResetSuccess"));
      loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!hasPermission("user:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">{t("users.accessDenied")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{t("users.title")}</h1>
          <p className="page-subtitle">{t("users.subtitle")}</p>
        </div>

        {canManage ? (
          <button type="button" onClick={openCreate} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">{t("users.addUser")}</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("common.email")}</th>
                <th>{t("common.role")}</th>
                <th>{t("users.locale")}</th>
                <th>{t("common.account")}</th>
                <th>{t("common.created")}</th>
                {canManage ? <th>{t("common.actions")}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-ink-900">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{roleLabel(user.role)}</td>
                  <td>{user.locale || "-"}</td>
                  <td>
                    <StatusBadge status={user.isActive ? "ACTIVE" : "SUSPENDED"} />
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  {canManage ? (
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(user)} className="secondary-btn !px-3 !py-2">
                          {t("common.edit")}
                        </button>
                        <button type="button" onClick={() => openResetPassword(user)} className="secondary-btn !px-3 !py-2">
                          <KeyRound size={14} />
                          <span className="ms-2">{t("users.resetPassword")}</span>
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title={editing ? t("users.editUser") : t("users.addUser")} open={modalOpen} onClose={() => setModalOpen(false)} width="max-w-5xl">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.fullName")}</span>
            <input className="field" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.email")}</span>
            <input className="field" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              {t("common.password")} {editing ? `(${t("common.optional")})` : ""}
            </span>
            <input className="field" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required={!editing} />
            {editing ? <span className="mt-2 block text-xs text-slate-500">{t("users.passwordOptional")}</span> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("common.role")}</span>
            <select className="field" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}>
              {["SUPER_ADMIN", "ADMIN", "STAFF", "FINANCE", "INSPECTOR", "VIEWER"].map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("users.locale")}</span>
            <select className="field" value={form.locale} onChange={(event) => setForm((prev) => ({ ...prev, locale: event.target.value }))}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
            <span className="text-sm font-semibold text-slate-700">{t("users.accountActive")}</span>
          </label>

          <div className="md:col-span-2 rounded-3xl border border-slate-200 p-4">
            <h4 className="text-lg font-black text-ink-900">{t("users.customPermissions")}</h4>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {permissions.map((permission) => (
                <label key={permission.code} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.customPermissions.includes(permission.code)}
                    onChange={() => togglePermission(permission.code)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{language === "en" ? permission.nameEn : permission.nameAr}</span>
                    <span className="block text-xs text-slate-500">{permission.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

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

      <Modal title={t("users.resetPassword")} open={resetModalOpen} onClose={() => setResetModalOpen(false)} width="max-w-xl">
        <form className="space-y-4" onSubmit={handleResetPassword}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {resetTarget ? `${t("common.email")}: ${resetTarget.email}` : null}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{t("users.newPassword")}</span>
            <input
              className="field"
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              required
            />
          </label>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setResetModalOpen(false)} className="secondary-btn">
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-btn">
              {t("common.resetPassword")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
