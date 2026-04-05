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

    const [
      companies,
      activeLicenses,
      pendingRenewal,
      expiringSoon,
      monthlyRevenue,
      recentCompanies,
      recentLicenses,
      recentPayments
    ] = await Promise.all([
      prisma.company.count(),
      prisma.license.count({ where: { status: LicenseStatus.ACTIVE } }),
      prisma.license.count({ where: { status: LicenseStatus.PENDING_RENEWAL } }),
      prisma.license.count({
        where: {
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
      })
    ]);

    res.json({
      stats: {
        companies,
        activeLicenses,
        pendingRenewal,
        expiringSoon,
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0
      },
      recentCompanies,
      recentLicenses,
      recentPayments
    });
  })
);

export { router as dashboardRouter };
