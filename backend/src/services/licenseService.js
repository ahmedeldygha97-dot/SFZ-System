import { randomUUID } from "crypto";
import { LicenseStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export async function syncExpiredLicenses() {
  await prisma.license.updateMany({
    where: {
      expiryDate: { lt: new Date() },
      status: {
        in: [LicenseStatus.ACTIVE, LicenseStatus.PENDING_RENEWAL]
      }
    },
    data: {
      status: LicenseStatus.EXPIRED
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

export function createPublicId() {
  return randomUUID().replace(/-/g, "");
}

export function buildVerificationUrl(publicId) {
  return `${env.appBaseUrl.replace(/\/$/, "")}/verify/${publicId}`;
}
