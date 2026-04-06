import { useEffect, useState } from "react";
import { Download, FileUp, RefreshCcw, Save, ShieldCheck, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest, downloadFile } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSystem } from "../context/SystemContext";
import { formatDate, statusLabel } from "../utils/format";
import { readFileAsBase64 } from "../utils/file";

const tabs = ["general", "backups", "audit", "security"];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { refreshSettings, language } = useSystem();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [backups, setBackups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState(null);
  const [logOptions, setLogOptions] = useState({ users: [], actions: [] });
  const [logFilters, setLogFilters] = useState({
    search: "",
    from: "",
    to: "",
    status: "",
    userId: "",
    action: "",
    entityType: ""
  });
  const [generalForm, setGeneralForm] = useState(null);
  const [backupForm, setBackupForm] = useState(null);
  const [securityForm, setSecurityForm] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadSettings() {
    const payload = await apiRequest("/settings", { token });
    setSettings(payload.item);
    setPermissions(payload.permissions);
    setGeneralForm({
      systemNameAr: payload.item.systemNameAr || "",
      systemNameEn: payload.item.systemNameEn || "",
      defaultLanguage: payload.item.defaultLanguage || "ar",
      dateFormat: payload.item.dateFormat || "dd/MM/yyyy",
      timeZone: payload.item.timeZone || "Africa/Tripoli",
      themePreference: payload.item.themePreference || "light",
      contactEmail: payload.item.contactEmail || "",
      contactPhone: payload.item.contactPhone || "",
      contactWebsite: payload.item.contactWebsite || "",
      printFooterAr: payload.item.printFooterAr || "",
      printFooterEn: payload.item.printFooterEn || "",
      verificationStatementAr: payload.item.verificationStatementAr || "",
      verificationStatementEn: payload.item.verificationStatementEn || "",
      printShowDualLogo: Boolean(payload.item.printShowDualLogo)
    });
    setBackupForm({
      autoBackupEnabled: Boolean(payload.item.autoBackupEnabled),
      backupFrequency: payload.item.backupFrequency || "WEEKLY",
      backupRetentionCount: payload.item.backupRetentionCount || 7,
      backupLocation: payload.item.backupLocation || "uploads/backups"
    });
    setSecurityForm({
      sessionTimeoutMinutes: payload.item.sessionTimeoutMinutes || 720,
      passwordMinLength: payload.item.passwordMinLength || 8,
      passwordRequireUppercase: Boolean(payload.item.passwordRequireUppercase),
      passwordRequireNumber: Boolean(payload.item.passwordRequireNumber),
      passwordRequireSpecial: Boolean(payload.item.passwordRequireSpecial),
      lockoutAttempts: payload.item.lockoutAttempts || 5,
      lockoutDurationMinutes: payload.item.lockoutDurationMinutes || 15
    });
  }

  async function loadBackups() {
    const payload = await apiRequest("/backups", { token });
    setBackups(payload.items);
  }

  async function loadLogs() {
    const params = new URLSearchParams();
    if (logFilters.search) params.set("search", logFilters.search);
    if (logFilters.from) params.set("from", logFilters.from);
    if (logFilters.to) params.set("to", logFilters.to);
    if (logFilters.status) params.set("status", logFilters.status);
    if (logFilters.userId) params.set("userId", logFilters.userId);
    if (logFilters.action) params.set("action", logFilters.action);
    if (logFilters.entityType) params.set("entityType", logFilters.entityType);

    const payload = await apiRequest(`/logs?${params.toString()}`, { token });
    setLogs(payload.items);
    setLogPagination(payload.pagination);
    setLogOptions(payload.filters);
  }

  async function refreshAll() {
    setError("");
    try {
      await Promise.all([loadSettings(), loadBackups(), loadLogs()]);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadLogs().catch((requestError) => setError(requestError.message));
  }, [logFilters.search, logFilters.from, logFilters.to, logFilters.status, logFilters.userId, logFilters.action, logFilters.entityType]);

  async function saveGeneralSettings() {
    try {
      const payload = await apiRequest("/settings/general", {
        method: "PATCH",
        token,
        body: generalForm
      });
      setSettings(payload.item);
      await refreshSettings();
      setSuccess(language === "en" ? "General settings saved successfully." : "تم حفظ الإعدادات العامة بنجاح.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveBackupSettings() {
    try {
      const payload = await apiRequest("/settings/backup", {
        method: "PATCH",
        token,
        body: backupForm
      });
      setSettings(payload.item);
      setSuccess(language === "en" ? "Backup settings saved successfully." : "تم حفظ إعدادات النسخ الاحتياطي.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveSecuritySettings() {
    try {
      const payload = await apiRequest("/settings/security", {
        method: "PATCH",
        token,
        body: securityForm
      });
      setSettings(payload.item);
      setSuccess(language === "en" ? "Security settings saved successfully." : "تم حفظ إعدادات الأمان.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadLogo(file) {
    if (!file) {
      return;
    }

    try {
      const contentBase64 = await readFileAsBase64(file);
      await apiRequest("/settings/logo", {
        method: "POST",
        token,
        body: {
          fileName: file.name,
          mimeType: file.type || "image/png",
          contentBase64
        }
      });
      await refreshAll();
      await refreshSettings();
      setSuccess(language === "en" ? "Logo updated successfully." : "تم تحديث الشعار.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createBackup() {
    try {
      await apiRequest("/backups/create", {
        method: "POST",
        token
      });
      await loadBackups();
      await loadSettings();
      setSuccess(language === "en" ? "A new backup was created successfully." : "تم إنشاء نسخة احتياطية جديدة.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function downloadBackup(backup) {
    try {
      const blob = await downloadFile(`/backups/${backup.id}/download`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function restoreBackupFile() {
    if (!restoreFile || restorePhrase.trim().toUpperCase() !== "RESTORE") {
      return;
    }

    try {
      const contentBase64 = await readFileAsBase64(restoreFile);
      await apiRequest("/backups/restore", {
        method: "POST",
        token,
        body: {
          fileName: restoreFile.name,
          contentBase64,
          confirmRestore: true,
          confirmationPhrase: restorePhrase
        }
      });
      await refreshAll();
      setRestoreFile(null);
      setRestorePhrase("");
      setSuccess(language === "en" ? "Backup restored successfully." : "تمت استعادة النسخة الاحتياطية بنجاح.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function exportLogsCsv() {
    try {
      const blob = await downloadFile("/logs/export/csv", token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-logs.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function exportLogsPdf() {
    try {
      const params = new URLSearchParams();
      if (logFilters.search) params.set("search", logFilters.search);
      if (logFilters.from) params.set("from", logFilters.from);
      if (logFilters.to) params.set("to", logFilters.to);
      if (logFilters.status) params.set("status", logFilters.status);
      if (logFilters.userId) params.set("userId", logFilters.userId);
      if (logFilters.action) params.set("action", logFilters.action);
      if (logFilters.entityType) params.set("entityType", logFilters.entityType);
      params.set("lang", language);

      const blob = await downloadFile(`/logs/export/pdf?${params.toString()}`, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-logs-report.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (!settings || !generalForm || !backupForm || !securityForm) {
    return <div className="page-card">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t("settings.title")}</h1>
        <p className="page-subtitle">{t("settings.subtitle")}</p>
      </div>

      {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div> : null}

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? "primary-btn" : "secondary-btn"}
          >
            {t(`settings.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {activeTab === "general" ? (
        <section className="page-card space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["systemNameAr", t("settings.general.systemNameAr")],
              ["systemNameEn", t("settings.general.systemNameEn")],
              ["dateFormat", t("settings.general.dateFormat")],
              ["timeZone", t("settings.general.timeZone")],
              ["themePreference", t("settings.general.themePreference")],
              ["contactEmail", t("settings.general.contactEmail")],
              ["contactPhone", t("settings.general.contactPhone")],
              ["contactWebsite", t("settings.general.contactWebsite")]
            ].map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
                <input
                  className="field"
                  value={generalForm[field]}
                  onChange={(event) => setGeneralForm((prev) => ({ ...prev, [field]: event.target.value }))}
                />
              </label>
            ))}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{t("settings.general.defaultLanguage")}</span>
              <select
                className="field"
                value={generalForm.defaultLanguage}
                onChange={(event) => setGeneralForm((prev) => ({ ...prev, defaultLanguage: event.target.value }))}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={generalForm.printShowDualLogo}
                onChange={(event) => setGeneralForm((prev) => ({ ...prev, printShowDualLogo: event.target.checked }))}
              />
              <span className="text-sm font-semibold text-slate-700">{t("settings.general.dualLogo")}</span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["printFooterAr", t("settings.general.printFooterAr")],
              ["printFooterEn", t("settings.general.printFooterEn")],
              ["verificationStatementAr", t("settings.general.verificationStatementAr")],
              ["verificationStatementEn", t("settings.general.verificationStatementEn")]
            ].map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
                <textarea
                  className="field min-h-24"
                  value={generalForm[field]}
                  onChange={(event) => setGeneralForm((prev) => ({ ...prev, [field]: event.target.value }))}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="secondary-btn cursor-pointer">
              <Upload size={16} />
              <span className="ms-2">{t("settings.general.uploadLogo")}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            </label>

            <button type="button" onClick={saveGeneralSettings} className="primary-btn">
              <Save size={16} />
              <span className="ms-2">{t("common.save")}</span>
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "backups" ? (
        <section className="space-y-6">
          <div className="page-card space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={backupForm.autoBackupEnabled}
                  onChange={(event) => setBackupForm((prev) => ({ ...prev, autoBackupEnabled: event.target.checked }))}
                />
                <span className="text-sm font-semibold text-slate-700">{t("settings.backups.autoBackupEnabled")}</span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t("settings.backups.frequency")}</span>
                <select
                  className="field"
                  value={backupForm.backupFrequency}
                  onChange={(event) => setBackupForm((prev) => ({ ...prev, backupFrequency: event.target.value }))}
                >
                  <option value="DAILY">{t("settings.backups.daily")}</option>
                  <option value="WEEKLY">{t("settings.backups.weekly")}</option>
                  <option value="MONTHLY">{t("settings.backups.monthly")}</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t("settings.backups.retention")}</span>
                <input
                  className="field"
                  type="number"
                  value={backupForm.backupRetentionCount}
                  onChange={(event) =>
                    setBackupForm((prev) => ({ ...prev, backupRetentionCount: Number(event.target.value) }))
                  }
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t("settings.backups.location")}</span>
                <input
                  className="field"
                  value={backupForm.backupLocation}
                  onChange={(event) => setBackupForm((prev) => ({ ...prev, backupLocation: event.target.value }))}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={saveBackupSettings} className="primary-btn">
                <Save size={16} />
                <span className="ms-2">{t("common.save")}</span>
              </button>

              <button type="button" onClick={createBackup} className="secondary-btn">
                <RefreshCcw size={16} />
                <span className="ms-2">{t("settings.backups.manualBackup")}</span>
              </button>
            </div>

            <div className="text-sm text-slate-500">
              {t("settings.backups.lastBackup")}: {settings.lastBackupAt ? formatDate(settings.lastBackupAt) : "-"}
            </div>
          </div>

          <div className="page-card space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-ink-900">{t("settings.backups.restore")}</h2>
              <label className="secondary-btn cursor-pointer">
                <FileUp size={16} />
                <span className="ms-2">{t("settings.backups.restore")}</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>

            {restoreFile ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div>{restoreFile.name}</div>
                <p className="mt-3 text-slate-500">{t("settings.backups.confirmationHelper")}</p>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{t("settings.backups.confirmationLabel")}</span>
                  <input className="field" value={restorePhrase} onChange={(event) => setRestorePhrase(event.target.value)} />
                </label>
                <button type="button" onClick={restoreBackupFile} className="primary-btn mt-3">
                  {t("settings.backups.confirmRestore")}
                </button>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("settings.backups.file")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("settings.backups.frequency")}</th>
                    <th>{t("settings.backups.lastBackup")}</th>
                    <th>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>{backup.fileName}</td>
                      <td>{backup.status}</td>
                      <td>{backup.frequency || backup.type}</td>
                      <td>{formatDate(backup.createdAt)}</td>
                      <td>
                        <button type="button" onClick={() => downloadBackup(backup)} className="secondary-btn !px-3 !py-2">
                          <Download size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "audit" ? (
        <section className="page-card space-y-5">
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
            <input
              className="field"
              placeholder={t("common.search")}
              value={logFilters.search}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <input
              className="field"
              type="date"
              value={logFilters.from}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
            <input
              className="field"
              type="date"
              value={logFilters.to}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
            <select
              className="field"
              value={logFilters.status}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">{t("common.allStatuses")}</option>
              <option value="SUCCESS">{statusLabel("SUCCESS")}</option>
              <option value="FAILED">{statusLabel("FAILED")}</option>
            </select>
            <select className="field" value={logFilters.userId} onChange={(event) => setLogFilters((prev) => ({ ...prev, userId: event.target.value }))}>
              <option value="">{t("common.allUsers")}</option>
              {logOptions.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <select className="field" value={logFilters.action} onChange={(event) => setLogFilters((prev) => ({ ...prev, action: event.target.value }))}>
              <option value="">{t("common.allActions")}</option>
              {logOptions.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <input
              className="field"
              placeholder={t("settings.audit.entity")}
              value={logFilters.entityType}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, entityType: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={exportLogsCsv} className="secondary-btn">
              <Download size={16} />
              <span className="ms-2">{t("settings.audit.exportCsv")}</span>
            </button>
            <button type="button" onClick={exportLogsPdf} className="secondary-btn">
              <Download size={16} />
              <span className="ms-2">{t("settings.audit.exportPdf")}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("settings.audit.user")}</th>
                  <th>{t("settings.audit.action")}</th>
                  <th>{t("settings.audit.entity")}</th>
                  <th>{t("settings.audit.target")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("settings.audit.ip")}</th>
                  <th>{t("common.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.userName || "-"}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType}</td>
                    <td>{log.targetName || log.entityId || "-"}</td>
                    <td>{statusLabel(log.status)}</td>
                    <td>{log.ipAddress || "-"}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logPagination ? (
            <div className="text-sm text-slate-500">
              {logPagination.total} {t("settings.audit.records")}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="page-card space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["sessionTimeoutMinutes", t("settings.security.sessionTimeout")],
              ["passwordMinLength", t("settings.security.passwordMinLength")],
              ["lockoutAttempts", t("settings.security.lockoutAttempts")],
              ["lockoutDurationMinutes", t("settings.security.lockoutDuration")]
            ].map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
                <input
                  className="field"
                  type="number"
                  value={securityForm[field]}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, [field]: Number(event.target.value) }))}
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["passwordRequireUppercase", t("settings.security.requireUppercase")],
              ["passwordRequireNumber", t("settings.security.requireNumber")],
              ["passwordRequireSpecial", t("settings.security.requireSpecial")]
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={securityForm[field]}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, [field]: event.target.checked }))}
                />
                <span className="text-sm font-semibold text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <button type="button" onClick={saveSecuritySettings} className="primary-btn">
            <ShieldCheck size={16} />
            <span className="ms-2">{t("common.save")}</span>
          </button>
        </section>
      ) : null}

      <section className="page-card">
        <h2 className="text-xl font-black text-ink-900">{t("settings.permissionsCatalog")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {permissions.map((permission) => (
            <div key={permission.code} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="font-bold text-ink-900">{language === "en" ? permission.nameEn : permission.nameAr}</div>
              <div className="text-slate-500">{permission.code}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
