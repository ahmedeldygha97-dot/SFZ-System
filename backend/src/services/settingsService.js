import path from "path";
import { BackupFrequency } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { resolveUploadsPath } from "../utils/storage.js";

export const DEFAULT_SETTINGS = {
  key: "default",
  systemNameAr: "نظام إدارة الشركات والتراخيص التجارية",
  systemNameEn: "Commercial Licensing Management System",
  defaultLanguage: "ar",
  dateFormat: "dd/MM/yyyy",
  timeZone: "Africa/Tripoli",
  themePreference: "light",
  logoPath: null,
  printFooterAr: "وثيقة رسمية صادرة عن النظام الإلكتروني للتحقق والطباعة.",
  printFooterEn: "Official document issued by the digital registry and verification platform.",
  contactEmail: "info@sfz.local",
  contactPhone: "+218 91 000 0000",
  contactWebsite: "https://example.com",
  verificationStatementAr: "يمكن التحقق من صحة هذه الوثيقة من خلال رمز QR أو رابط التحقق العام.",
  verificationStatementEn: "This document can be verified using the QR code or the public verification link.",
  printShowDualLogo: true,
  autoBackupEnabled: false,
  backupFrequency: BackupFrequency.WEEKLY,
  backupRetentionCount: 7,
  backupLocation: "uploads/backups",
  lastBackupAt: null,
  lastBackupStatus: null,
  sessionTimeoutMinutes: 720,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  lockoutAttempts: 5,
  lockoutDurationMinutes: 15
};

export async function ensureSystemSettings(updatedById = null) {
  const existing = await prisma.systemSetting.findUnique({
    where: { key: DEFAULT_SETTINGS.key }
  });

  if (existing) {
    return existing;
  }

  return prisma.systemSetting.create({
    data: {
      ...DEFAULT_SETTINGS,
      updatedById
    }
  });
}

export async function getSystemSettings() {
  const settings = await ensureSystemSettings();
  return settings;
}

export function normalizePublicPath(filePath) {
  if (!filePath) {
    return null;
  }

  return `/${filePath.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

export function getLogoUrl(settings) {
  return normalizePublicPath(settings.logoPath);
}

export function buildPublicSettingsPayload(settings) {
  return {
    systemNameAr: settings.systemNameAr,
    systemNameEn: settings.systemNameEn,
    defaultLanguage: settings.defaultLanguage,
    dateFormat: settings.dateFormat,
    timeZone: settings.timeZone,
    themePreference: settings.themePreference,
    logoUrl: getLogoUrl(settings),
    printFooterAr: settings.printFooterAr,
    printFooterEn: settings.printFooterEn,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactWebsite: settings.contactWebsite,
    verificationStatementAr: settings.verificationStatementAr,
    verificationStatementEn: settings.verificationStatementEn,
    printShowDualLogo: settings.printShowDualLogo
  };
}

export function resolveBackupDirectory(settings) {
  const relativeLocation = settings.backupLocation || DEFAULT_SETTINGS.backupLocation;
  return relativeLocation.startsWith("uploads")
    ? resolveUploadsPath(relativeLocation.replace(/^uploads[\\/]/, ""))
    : path.resolve(relativeLocation);
}
