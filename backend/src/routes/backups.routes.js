import fs from "fs/promises";
import express from "express";
import { z } from "zod";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import {
  createBackup,
  getBackupDownloadPath,
  listBackups,
  restoreBackup
} from "../services/backupService.js";

const router = express.Router();

const restoreSchema = z.object({
  fileName: z.string().min(3),
  contentBase64: z.string().min(10),
  confirmRestore: z.boolean(),
  confirmationPhrase: z.string().trim().min(1)
});

router.get(
  "/",
  authorize(PERMISSIONS.BACKUP_VIEW),
  asyncHandler(async (_req, res) => {
    const items = await listBackups();
    res.json({ items });
  })
);

router.post(
  "/create",
  authorize(PERMISSIONS.BACKUP_MANAGE),
  asyncHandler(async (req, res) => {
    const item = await createBackup({
      createdById: req.user.id
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "backup.create",
      entityType: "Backup",
      entityId: item.id,
      targetName: item.fileName
    });

    res.status(201).json({ item });
  })
);

router.get(
  "/:id/download",
  authorize(PERMISSIONS.BACKUP_VIEW),
  asyncHandler(async (req, res) => {
    const { backup, absolutePath } = await getBackupDownloadPath(req.params.id);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${backup.fileName}"`);
    res.sendFile(absolutePath);
  })
);

router.post(
  "/restore",
  authorize(PERMISSIONS.BACKUP_MANAGE),
  asyncHandler(async (req, res) => {
    const { fileName, contentBase64, confirmRestore, confirmationPhrase } = restoreSchema.parse(req.body ?? {});

    const rawContent = Buffer.from(contentBase64, "base64").toString("utf-8");
    const parsed = JSON.parse(rawContent);
    const item = await restoreBackup({
      backupFile: parsed,
      restoredById: req.user.id,
      confirmRestore: Boolean(confirmRestore),
      confirmationPhrase,
      restoreNote: `Backup restored from ${fileName}.`
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "backup.restore",
      entityType: "Backup",
      entityId: item.id,
      targetName: fileName
    });

    res.json({ item });
  })
);

router.get(
  "/:id/validate",
  authorize(PERMISSIONS.BACKUP_VIEW),
  asyncHandler(async (req, res) => {
    const { backup, absolutePath } = await getBackupDownloadPath(req.params.id);
    const rawContent = await fs.readFile(absolutePath, "utf-8");
    const parsed = JSON.parse(rawContent);

    res.json({
      item: {
        id: backup.id,
        fileName: backup.fileName,
        checksum: backup.checksum,
        schemaVersion: parsed.schemaVersion,
        exportedAt: parsed.exportedAt,
        valid: true
      }
    });
  })
);

export { router as backupsRouter };
