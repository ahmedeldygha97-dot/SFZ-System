import { randomUUID } from "crypto";
import { LicenseStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export async function syncExpiredLicenses() {
  const now = new Date();
  const expiringSoonCutoff = new Date();
  expiringSoonCutoff.setDate(expiringSoonCutoff.getDate() + 30);

  await prisma.license.updateMany({
    where: {
      expiryDate: { lt: now },
      status: {
        in: [LicenseStatus.ACTIVE, LicenseStatus.EXPIRING_SOON]
      }
    },
    data: {
      status: LicenseStatus.EXPIRED
    }
  });

  await prisma.license.updateMany({
    where: {
      expiryDate: {
        gte: now,
        lte: expiringSoonCutoff
      },
      status: LicenseStatus.ACTIVE
    },
    data: {
      status: LicenseStatus.EXPIRING_SOON
    }
  });

  await prisma.license.updateMany({
    where: {
      expiryDate: {
        gt: expiringSoonCutoff
      },
      status: LicenseStatus.EXPIRING_SOON
    },
    data: {
      status: LicenseStatus.ACTIVE
    }
  });
}

export async function generateCompanyRegistrationNumber() {
  const year = new Date().getFullYear();
  const total = await prisma.company.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }
  });

  return `COMP-${year}-${String(total + 1).padStart(4, "0")}`;
}

export async function generateLicenseNumber() {
  const year = new Date().getFullYear();
  const total = await prisma.license.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }
  });

  return `LIC-${year}-${String(total + 1).padStart(5, "0")}`;
}

export async function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const total = await prisma.payment.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    }
  });

  return `RCP-${year}-${String(total + 1).padStart(5, "0")}`;
}

export async function recordLicenseStatusHistory({ licenseId, status, changedById = null, reason = null }) {
  return prisma.licenseStatusHistory.create({
    data: {
      licenseId,
      status,
      changedById,
      reason
    }
  });
}

export function createPublicId() {
  return randomUUID().replace(/-/g, "");
}

export function buildVerificationUrl(publicId) {
  return `${env.appBaseUrl.replace(/\/$/, "")}/verify/${publicId}`;
}
