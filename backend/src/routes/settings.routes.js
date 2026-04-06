import path from "path";
import { z } from "zod";
import express from "express";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAuditLog } from "../utils/audit.js";
import {
  buildPublicSettingsPayload,
  getSystemSettings
} from "../services/settingsService.js";
import { resolveProjectRoot, resolveUploadsPath, saveBase64File } from "../utils/storage.js";

const router = express.Router();

const generalSchema = z.object({
  systemNameAr: z.string().min(2),
  systemNameEn: z.string().min(2),
  defaultLanguage: z.enum(["ar", "en"]),
  dateFormat: z.string().min(2),
  timeZone: z.string().min(2),
  themePreference: z.string().min(2),
  contactEmail: z.string().email().or(z.literal("")).nullable(),
  contactPhone: z.string().optional().nullable(),
  contactWebsite: z.string().url().or(z.literal("")).nullable(),
  printFooterAr: z.string().optional().nullable(),
  printFooterEn: z.string().optional().nullable(),
  verificationStatementAr: z.string().optional().nullable(),
  verificationStatementEn: z.string().optional().nullable(),
  printShowDualLogo: z.boolean().optional().default(true)
});

const backupSchema = z.object({
  autoBackupEnabled: z.boolean(),
  backupFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  backupRetentionCount: z.coerce.number().int().min(1).max(90),
  backupLocation: z.string().min(3)
});

const securitySchema = z.object({
  sessionTimeoutMinutes: z.coerce.number().int().min(15).max(24 * 60),
  passwordMinLength: z.coerce.number().int().min(8).max(64),
  passwordRequireUppercase: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireSpecial: z.boolean(),
  lockoutAttempts: z.coerce.number().int().min(3).max(10),
  lockoutDurationMinutes: z.coerce.number().int().min(5).max(120)
});

const logoSchema = z.object({
  fileName: z.string().min(3),
  mimeType: z.string().min(3),
  contentBase64: z.string().min(10)
});

router.get(
  "/",
  authorize(PERMISSIONS.SETTINGS_VIEW),
  asyncHandler(async (_req, res) => {
    const [settings, roles, permissions] = await Promise.all([
      getSystemSettings(),
      prisma.role.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        },
        orderBy: { code: "asc" }
      }),
      prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { code: "asc" }]
      })
    ]);

    res.json({
      item: {
        ...settings,
        publicSettings: buildPublicSettingsPayload(settings)
      },
      roles,
      permissions
    });
  })
);

router.patch(
  "/general",
  authorize(PERMISSIONS.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = generalSchema.parse(req.body);
    const item = await prisma.systemSetting.update({
      where: { key: "default" },
      data: {
        ...payload,
        contactEmail: payload.contactEmail || null,
        contactWebsite: payload.contactWebsite || null,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "settings.general.update",
      entityType: "SystemSetting",
      entityId: item.id,
      targetName: item.key,
      metadata: payload
    });

    res.json({ item });
  })
);

router.patch(
  "/backup",
  authorize(PERMISSIONS.SETTINGS_MANAGE, PERMISSIONS.BACKUP_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = backupSchema.parse(req.body);
    const item = await prisma.systemSetting.update({
      where: { key: "default" },
      data: {
        ...payload,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "settings.backup.update",
      entityType: "SystemSetting",
      entityId: item.id,
      targetName: item.key,
      metadata: payload
    });

    res.json({ item });
  })
);

router.patch(
  "/security",
  authorize(PERMISSIONS.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = securitySchema.parse(req.body);
    const item = await prisma.systemSetting.update({
      where: { key: "default" },
      data: {
        ...payload,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "settings.security.update",
      entityType: "SystemSetting",
      entityId: item.id,
      targetName: item.key,
      metadata: payload
    });

    res.json({ item });
  })
);

router.post(
  "/logo",
  authorize(PERMISSIONS.SETTINGS_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = logoSchema.parse(req.body);
    const uploadDirectory = resolveUploadsPath("assets");
    const file = await saveBase64File({
      targetDirectory: uploadDirectory,
      originalName: payload.fileName,
      contentBase64: payload.contentBase64
    });

    const relativePath = path.relative(resolveProjectRoot(), file.absolutePath).replace(/\\/g, "/");
    const item = await prisma.systemSetting.update({
      where: { key: "default" },
      data: {
        logoPath: relativePath,
        updatedById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "settings.logo.update",
      entityType: "SystemSetting",
      entityId: item.id,
      targetName: item.key,
      metadata: { logoPath: relativePath }
    });

    res.json({
      item,
      logoUrl: `/${relativePath}`
    });
  })
);

export { router as settingsRouter };
