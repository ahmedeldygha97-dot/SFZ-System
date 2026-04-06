import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { BackupStatus, BackupType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { getSystemSettings, resolveBackupDirectory } from "./settingsService.js";
import { ensureDirectory, removeFileIfExists, resolveProjectRoot } from "../utils/storage.js";
import { createHttpError } from "../utils/httpError.js";

const BACKUP_SCHEMA_VERSION = 1;

function calculateChecksum(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function readOptionalBase64File(relativePath) {
  if (!relativePath) {
    return null;
  }

  const absolutePath = path.resolve(resolveProjectRoot(), relativePath);

  try {
    const buffer = await fs.readFile(absolutePath);
    return buffer.toString("base64");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function buildFilesPayload(settings, attachments) {
  const fileEntries = [];

  if (settings.logoPath) {
    const contentBase64 = await readOptionalBase64File(settings.logoPath);
    if (contentBase64) {
      fileEntries.push({
        type: "logo",
        relativePath: settings.logoPath,
        contentBase64
      });
    }
  }

  for (const attachment of attachments) {
    const contentBase64 = await readOptionalBase64File(attachment.filePath);

    if (contentBase64) {
      fileEntries.push({
        type: "attachment",
        attachmentId: attachment.id,
        relativePath: attachment.filePath,
        contentBase64,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType
      });
    }
  }

  return fileEntries;
}

async function buildBackupPayload() {
  const [
    settings,
    roles,
    permissions,
    rolePermissions,
    users,
    companies,
    licenses,
    statusHistory,
    renewals,
    payments,
    attachments,
    auditLogs
  ] = await Promise.all([
    getSystemSettings(),
    prisma.role.findMany({ orderBy: { code: "asc" } }),
    prisma.permission.findMany({ orderBy: { code: "asc" } }),
    prisma.rolePermission.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.company.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.license.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.licenseStatusHistory.findMany({ orderBy: { changedAt: "asc" } }),
    prisma.licenseRenewal.findMany({ orderBy: { renewedAt: "asc" } }),
    prisma.payment.findMany({ orderBy: { paymentDate: "asc" } }),
    prisma.attachment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const data = {
    roles,
    permissions,
    rolePermissions,
    users,
    settings,
    companies,
    licenses,
    statusHistory,
    renewals,
    payments,
    attachments,
    auditLogs
  };

  const files = await buildFilesPayload(settings, attachments);

  return {
    app: "SFZ-System",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    files
  };
}

async function enforceRetention(settings) {
  const retentionCount = Math.max(Number(settings.backupRetentionCount ?? 7), 1);
  const staleBackups = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    skip: retentionCount
  });

  for (const backup of staleBackups) {
    await removeFileIfExists(path.resolve(resolveProjectRoot(), backup.filePath));
  }

  if (staleBackups.length > 0) {
    await prisma.backup.deleteMany({
      where: {
        id: {
          in: staleBackups.map((item) => item.id)
        }
      }
    });
  }
}

export async function createBackup({ createdById = null, type = BackupType.MANUAL, notes = null } = {}) {
  const settings = await getSystemSettings();
  const payload = await buildBackupPayload();
  const checksum = calculateChecksum(payload);
  const backupFile = {
    ...payload,
    checksum
  };

  const backupDirectory = resolveBackupDirectory(settings);
  await ensureDirectory(backupDirectory);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `sfz-backup-${timestamp}.json`;
  const absolutePath = path.join(backupDirectory, fileName);
  const relativePath = path.relative(resolveProjectRoot(), absolutePath).replace(/\\/g, "/");
  const content = JSON.stringify(backupFile, null, 2);

  await fs.writeFile(absolutePath, content, "utf-8");

  const backup = await prisma.backup.create({
    data: {
      fileName,
      filePath: relativePath,
      fileSize: Buffer.byteLength(content),
      checksum,
      type,
      frequency: type === BackupType.AUTO ? settings.backupFrequency : null,
      status: BackupStatus.READY,
      notes,
      createdById,
      metadata: {
        records: {
          users: payload.data.users.length,
          companies: payload.data.companies.length,
          licenses: payload.data.licenses.length,
          payments: payload.data.payments.length,
          attachments: payload.data.attachments.length,
          auditLogs: payload.data.auditLogs.length
        }
      }
    }
  });

  await prisma.systemSetting.update({
    where: { key: "default" },
    data: {
      lastBackupAt: backup.createdAt,
      lastBackupStatus: BackupStatus.READY
    }
  });

  await enforceRetention(settings);

  return backup;
}

function validateBackupPayload(backupFile) {
  if (!backupFile || typeof backupFile !== "object") {
    throw new Error("Backup file is invalid.");
  }

  const basePayload = {
    app: backupFile.app,
    schemaVersion: backupFile.schemaVersion,
    exportedAt: backupFile.exportedAt,
    data: backupFile.data,
    files: backupFile.files
  };

  const checksum = calculateChecksum(basePayload);

  if (backupFile.app !== "SFZ-System" || backupFile.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("Backup file is not compatible with this application version.");
  }

  if (checksum !== backupFile.checksum) {
    throw new Error("Backup integrity validation failed.");
  }

  return backupFile;
}

async function restoreFiles(files = []) {
  for (const file of files) {
    if (!file.relativePath || !file.contentBase64) {
      continue;
    }

    const absolutePath = path.resolve(resolveProjectRoot(), file.relativePath);
    await ensureDirectory(path.dirname(absolutePath));
    await fs.writeFile(absolutePath, Buffer.from(file.contentBase64, "base64"));
  }
}

export async function restoreBackup({
  backupFile,
  restoredById = null,
  restoreNote = null,
  confirmRestore = false,
  confirmationPhrase = ""
}) {
  if (!confirmRestore) {
    throw createHttpError(400, "Restore confirmation is required before overwriting live data.");
  }

  if (confirmationPhrase.trim().toUpperCase() !== "RESTORE") {
    throw createHttpError(400, 'Type "RESTORE" to confirm backup restoration.');
  }

  const validatedBackup = validateBackupPayload(backupFile);
  const { data, files } = validatedBackup;

  await restoreFiles(files);

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.licenseRenewal.deleteMany(),
    prisma.licenseStatusHistory.deleteMany(),
    prisma.license.deleteMany(),
    prisma.company.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany()
  ]);

  if (data.roles.length > 0) {
    await prisma.role.createMany({ data: data.roles });
  }

  if (data.permissions.length > 0) {
    await prisma.permission.createMany({ data: data.permissions });
  }

  if (data.rolePermissions.length > 0) {
    await prisma.rolePermission.createMany({ data: data.rolePermissions });
  }

  if (data.users.length > 0) {
    await prisma.user.createMany({ data: data.users });
  }

  if (data.settings) {
    await prisma.systemSetting.create({
      data: {
        ...data.settings,
        lastBackupStatus: BackupStatus.RESTORED
      }
    });
  }

  if (data.companies.length > 0) {
    await prisma.company.createMany({ data: data.companies });
  }

  if (data.licenses.length > 0) {
    await prisma.license.createMany({ data: data.licenses });
  }

  if (data.statusHistory.length > 0) {
    await prisma.licenseStatusHistory.createMany({ data: data.statusHistory });
  }

  if (data.renewals.length > 0) {
    await prisma.licenseRenewal.createMany({ data: data.renewals });
  }

  if (data.payments.length > 0) {
    await prisma.payment.createMany({ data: data.payments });
  }

  if (data.attachments.length > 0) {
    await prisma.attachment.createMany({ data: data.attachments });
  }

  if (data.auditLogs.length > 0) {
    await prisma.auditLog.createMany({ data: data.auditLogs });
  }

  const settings = await getSystemSettings();
  const restoredBy = restoredById
    ? await prisma.user.findUnique({
        where: { id: restoredById },
        select: { id: true }
      })
    : null;
  const backupDirectory = resolveBackupDirectory(settings);
  await ensureDirectory(backupDirectory);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `restore-${timestamp}.json`;
  const absolutePath = path.join(backupDirectory, fileName);
  const relativePath = path.relative(resolveProjectRoot(), absolutePath).replace(/\\/g, "/");
  const content = JSON.stringify(validatedBackup, null, 2);

  await fs.writeFile(absolutePath, content, "utf-8");

  const record = await prisma.backup.create({
    data: {
      fileName,
      filePath: relativePath,
      fileSize: Buffer.byteLength(content),
      checksum: validatedBackup.checksum,
      type: BackupType.MANUAL,
      status: BackupStatus.RESTORED,
      notes: restoreNote ?? "Backup restored from uploaded file.",
      restoredById: restoredBy?.id ?? null,
      restoredAt: new Date(),
      metadata: {
        restoredFrom: validatedBackup.exportedAt
      }
    }
  });

  await prisma.systemSetting.update({
    where: { key: "default" },
    data: {
      lastBackupAt: new Date(),
      lastBackupStatus: BackupStatus.RESTORED
    }
  });

  return record;
}

export async function listBackups() {
  return prisma.backup.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      restoredBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getBackupDownloadPath(backupId) {
  const backup = await prisma.backup.findUnique({
    where: { id: backupId }
  });

  if (!backup) {
    throw new Error("Backup not found.");
  }

  return {
    backup,
    absolutePath: path.resolve(resolveProjectRoot(), backup.filePath)
  };
}
