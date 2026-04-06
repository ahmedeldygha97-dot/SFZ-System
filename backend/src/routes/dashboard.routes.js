import express from "express";
import { LicenseStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { syncExpiredLicenses } from "../services/licenseService.js";

const router = express.Router();

router.get(
  "/summary",
  authorize(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(async (_req, res) => {
    await syncExpiredLicenses();

    const now = new Date();
    const inThirtyDays = new Date();
    inThirtyDays.setDate(inThirtyDays.getDate() + 30);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      companies,
      activeLicenses,
      expiredLicenses,
      expiringSoon,
      monthlyRevenue,
      lastBackup,
      recentCompanies,
      recentLicenses,
      recentPayments,
      recentActivity
    ] = await Promise.all([
      prisma.company.count(),
      prisma.license.count({ where: { status: LicenseStatus.ACTIVE } }),
      prisma.license.count({ where: { status: LicenseStatus.EXPIRED } }),
      prisma.license.count({
        where: {
          status: LicenseStatus.EXPIRING_SOON,
          expiryDate: {
            gte: now,
            lte: inThirtyDays
          }
        }
      }),
      prisma.payment.aggregate({
        where: {
          paymentDate: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.backup.findFirst({
        orderBy: { createdAt: "desc" }
      }),
      prisma.company.findMany({
        take: 5,
        orderBy: { createdAt: "desc" }
      }),
      prisma.license.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { company: true }
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { paymentDate: "desc" },
        include: {
          company: true,
          license: true
        }
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: weekStart
          }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    res.json({
      stats: {
        companies,
        activeLicenses,
        expiredLicenses,
        expiringSoon,
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
        lastBackupAt: lastBackup?.createdAt ?? null
      },
      recentCompanies,
      recentLicenses,
      recentPayments,
      recentActivity
    });
  })
);

export { router as dashboardRouter };
