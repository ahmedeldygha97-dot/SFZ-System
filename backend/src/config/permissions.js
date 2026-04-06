export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  FINANCE: "FINANCE",
  INSPECTOR: "INSPECTOR",
  VIEWER: "VIEWER"
};

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  COMPANY_VIEW: "company:view",
  COMPANY_MANAGE: "company:manage",
  COMPANY_EXPORT: "company:export",
  LICENSE_VIEW: "license:view",
  LICENSE_MANAGE: "license:manage",
  LICENSE_STATUS_MANAGE: "license:status-manage",
  LICENSE_EXPORT: "license:export",
  PAYMENT_VIEW: "payment:view",
  PAYMENT_MANAGE: "payment:manage",
  PAYMENT_EXPORT: "payment:export",
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",
  USER_VIEW: "user:view",
  USER_MANAGE: "user:manage",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  BACKUP_VIEW: "backup:view",
  BACKUP_MANAGE: "backup:manage",
  LOG_VIEW: "log:view",
  ATTACHMENT_VIEW: "attachment:view",
  ATTACHMENT_MANAGE: "attachment:manage"
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_MANAGE,
    PERMISSIONS.COMPANY_EXPORT,
    PERMISSIONS.LICENSE_VIEW,
    PERMISSIONS.LICENSE_MANAGE,
    PERMISSIONS.LICENSE_STATUS_MANAGE,
    PERMISSIONS.LICENSE_EXPORT,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.PAYMENT_EXPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.BACKUP_VIEW,
    PERMISSIONS.BACKUP_MANAGE,
    PERMISSIONS.LOG_VIEW,
    PERMISSIONS.ATTACHMENT_VIEW,
    PERMISSIONS.ATTACHMENT_MANAGE
  ],
  [USER_ROLES.STAFF]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_MANAGE,
    PERMISSIONS.COMPANY_EXPORT,
    PERMISSIONS.LICENSE_VIEW,
    PERMISSIONS.LICENSE_MANAGE,
    PERMISSIONS.LICENSE_EXPORT,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.ATTACHMENT_VIEW,
    PERMISSIONS.ATTACHMENT_MANAGE
  ],
  [USER_ROLES.FINANCE]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.LICENSE_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.PAYMENT_EXPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.ATTACHMENT_VIEW
  ],
  [USER_ROLES.INSPECTOR]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_MANAGE,
    PERMISSIONS.COMPANY_EXPORT,
    PERMISSIONS.LICENSE_VIEW,
    PERMISSIONS.LICENSE_MANAGE,
    PERMISSIONS.LICENSE_STATUS_MANAGE,
    PERMISSIONS.LICENSE_EXPORT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.ATTACHMENT_VIEW
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.LICENSE_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.ATTACHMENT_VIEW
  ]
};

export const PERMISSION_DEFINITIONS = [
  ["dashboard:view", "dashboard", "عرض لوحة التحكم", "View dashboard"],
  ["company:view", "companies", "عرض الشركات", "View companies"],
  ["company:manage", "companies", "إدارة الشركات", "Manage companies"],
  ["company:export", "companies", "طباعة وتصدير بيانات الشركات", "Export company data"],
  ["license:view", "licenses", "عرض التراخيص", "View licenses"],
  ["license:manage", "licenses", "إدارة التراخيص", "Manage licenses"],
  ["license:status-manage", "licenses", "تعليق أو إعادة تفعيل الترخيص", "Suspend or reactivate licenses"],
  ["license:export", "licenses", "طباعة وتصدير التراخيص", "Export licenses"],
  ["payment:view", "payments", "عرض المدفوعات", "View payments"],
  ["payment:manage", "payments", "إدارة المدفوعات", "Manage payments"],
  ["payment:export", "payments", "تصدير المدفوعات", "Export payments"],
  ["report:view", "reports", "عرض التقارير", "View reports"],
  ["report:export", "reports", "تصدير التقارير", "Export reports"],
  ["user:view", "users", "عرض المستخدمين", "View users"],
  ["user:manage", "users", "إدارة المستخدمين", "Manage users"],
  ["settings:view", "settings", "عرض الإعدادات", "View settings"],
  ["settings:manage", "settings", "إدارة الإعدادات", "Manage settings"],
  ["backup:view", "backups", "عرض النسخ الاحتياطية", "View backups"],
  ["backup:manage", "backups", "إدارة النسخ الاحتياطية", "Manage backups"],
  ["log:view", "logs", "عرض السجل التدقيقي", "View audit logs"],
  ["attachment:view", "attachments", "عرض المرفقات", "View attachments"],
  ["attachment:manage", "attachments", "إدارة المرفقات", "Manage attachments"]
].map(([code, module, nameAr, nameEn]) => ({
  code,
  module,
  nameAr,
  nameEn
}));

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function mergeUserPermissions(role, customPermissions) {
  const userPermissions = Array.isArray(customPermissions) ? customPermissions.filter(Boolean) : [];
  return Array.from(new Set([...getRolePermissions(role), ...userPermissions]));
}

export function hasPermission(role, permission, customPermissions) {
  return mergeUserPermissions(role, customPermissions).includes(permission);
}
