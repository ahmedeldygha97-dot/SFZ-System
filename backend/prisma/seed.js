import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import {
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSIONS,
  USER_ROLES
} from "../src/config/permissions.js";
import { DEFAULT_SETTINGS } from "../src/services/settingsService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROLE_DEFINITIONS = [
  { code: USER_ROLES.SUPER_ADMIN, nameAr: "مدير النظام الأعلى", nameEn: "Super Administrator" },
  { code: USER_ROLES.ADMIN, nameAr: "مدير", nameEn: "Administrator" },
  { code: USER_ROLES.STAFF, nameAr: "موظف", nameEn: "Staff" },
  { code: USER_ROLES.FINANCE, nameAr: "مالية", nameEn: "Finance" },
  { code: USER_ROLES.INSPECTOR, nameAr: "مفتش", nameEn: "Inspector" },
  { code: USER_ROLES.VIEWER, nameAr: "مشاهد", nameEn: "Viewer" }
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sfz.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123456";
  const adminHash = await bcrypt.hash(adminPassword, 12);

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

  await prisma.systemSetting.upsert({
    where: { key: DEFAULT_SETTINGS.key },
    update: DEFAULT_SETTINGS,
    create: DEFAULT_SETTINGS
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Administrator",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      locale: "ar",
      passwordHash: adminHash
    },
    create: {
      name: "System Administrator",
      email: adminEmail,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      locale: "ar",
      passwordHash: adminHash
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.log("Seed completed successfully.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
