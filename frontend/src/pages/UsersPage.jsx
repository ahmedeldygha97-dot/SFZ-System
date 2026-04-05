import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";
import { formatDate } from "../utils/format";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "VIEWER",
  isActive: true
};

export default function UsersPage() {
  const { token, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const canManage = hasPermission("user:manage");

  async function loadUsers() {
    try {
      const payload = await apiRequest("/users", { token });
      setUsers(payload.items);
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
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
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
      loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!hasPermission("user:view")) {
    return <div className="page-card text-sm font-semibold text-slate-600">You do not have access to user management.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">User access and permissions</h1>
          <p className="page-subtitle">Control account activation, role assignment, and least-privilege access to each module.</p>
        </div>

        {canManage ? (
          <button type="button" onClick={openCreate} className="primary-btn">
            <Plus size={16} />
            <span className="ms-2">Add user</span>
          </button>
        ) : null}
      </div>

      <section className="page-card">
        {error ? <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Account</th>
                <th>Created</th>
                {canManage ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-ink-900">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <StatusBadge status={user.isActive ? "ACTIVE" : "SUSPENDED"} />
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  {canManage ? (
                    <td>
                      <button type="button" onClick={() => openEdit(user)} className="secondary-btn !px-3 !py-2">
                        Edit
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title={editing ? "Edit user" : "Create user"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
            <input className="field" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
            <input className="field" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Password {editing ? "(optional)" : ""}</span>
            <input className="field" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required={!editing} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Role</span>
            <select className="field" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}>
              {["SUPER_ADMIN", "ADMIN", "FINANCE", "INSPECTOR", "VIEWER"].map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span className="text-sm font-semibold text-slate-700">Account is active</span>
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="secondary-btn">
              Cancel
            </button>
            <button type="submit" className="primary-btn">
              {editing ? "Update user" : "Create user"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
