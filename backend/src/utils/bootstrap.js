import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import {
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSIONS,
  USER_ROLES
} from "../config/permissions.js";
import { ensureSystemSettings } from "../services/settingsService.js";

const ROLE_DEFINITIONS = [
  {
    code: USER_ROLES.SUPER_ADMIN,
    nameAr: "مدير النظام الأعلى",
    nameEn: "Super Administrator",
    descriptionAr: "صلاحيات كاملة على جميع وحدات النظام.",
    descriptionEn: "Full access to every system module."
  },
  {
    code: USER_ROLES.ADMIN,
    nameAr: "مدير",
    nameEn: "Administrator",
    descriptionAr: "إدارة الشركات والتراخيص والتقارير والمستخدمين.",
    descriptionEn: "Manage companies, licenses, reports, and users."
  },
  {
    code: USER_ROLES.STAFF,
    nameAr: "موظف",
    nameEn: "Staff",
    descriptionAr: "إدارة تشغيلية يومية ضمن الصلاحيات الممنوحة.",
    descriptionEn: "Operational staff access within granted permissions."
  },
  {
    code: USER_ROLES.FINANCE,
    nameAr: "مالية",
    nameEn: "Finance",
    descriptionAr: "إدارة التحصيل والمدفوعات والتقارير المالية.",
    descriptionEn: "Manage collections, payments, and finance reporting."
  },
  {
    code: USER_ROLES.INSPECTOR,
    nameAr: "مفتش",
    nameEn: "Inspector",
    descriptionAr: "مراجعة الشركات والتراخيص والحالة التنظيمية.",
    descriptionEn: "Review companies, licenses, and compliance status."
  },
  {
    code: USER_ROLES.VIEWER,
    nameAr: "مشاهد",
    nameEn: "Viewer",
    descriptionAr: "وصول للقراءة فقط.",
    descriptionEn: "Read-only access."
  }
];

export async function ensureDefaultAdmin() {
  await ensureSystemSettings();

  for (const role of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role
    });
  }

  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission
    });
  }

  await prisma.rolePermission.deleteMany();
  await prisma.rolePermission.createMany({
    data: Object.entries(ROLE_PERMISSIONS).flatMap(([roleCode, permissions]) =>
      permissions.map((permissionCode) => ({
        roleCode,
        permissionCode
      }))
    )
  });

  const totalUsers = await prisma.user.count();

  if (totalUsers > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);

  await prisma.user.create({
    data: {
      name: "System Administrator",
      email: env.adminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      locale: "ar"
    }
  });

  console.log(`Default admin created: ${env.adminEmail}`);
}
