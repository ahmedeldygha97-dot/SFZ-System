import express from "express";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { syncExpiredLicenses } from "../services/licenseService.js";

const router = express.Router();

router.get(
  "/analytics",
  authorize(PERMISSIONS.REPORT_VIEW),
  asyncHandler(async (req, res) => {
    await syncExpiredLicenses();

    const from = req.query.from ? new Date(req.query.from.toString()) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to.toString()) : new Date();
    const expiringDays = Number(req.query.expiringDays ?? 45);

    const expiringUntil = new Date();
    expiringUntil.setDate(expiringUntil.getDate() + expiringDays);

    const [payments, expiringLicenses, statusBreakdown] = await Promise.all([
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: from,
            lte: to
          }
        },
        include: {
          company: true
        },
        orderBy: { paymentDate: "asc" }
      }),
      prisma.license.findMany({
        where: {
          expiryDate: {
            gte: new Date(),
            lte: expiringUntil
          }
        },
        include: {
          company: true
        },
        orderBy: { expiryDate: "asc" }
      }),
      prisma.license.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      })
    ]);

    const monthlyRevenueMap = new Map();
    const paymentMethodMap = new Map();

    payments.forEach((payment) => {
      const monthKey = new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric"
      }).format(new Date(payment.paymentDate));

      monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) ?? 0) + Number(payment.amount));
      paymentMethodMap.set(payment.method, (paymentMethodMap.get(payment.method) ?? 0) + Number(payment.amount));
    });

    const topCompanies = new Map();
    payments.forEach((payment) => {
      const current = topCompanies.get(payment.company.nameEn) ?? 0;
      topCompanies.set(payment.company.nameEn, current + Number(payment.amount));
    });

    res.json({
      monthlyRevenue: Array.from(monthlyRevenueMap.entries()).map(([label, value]) => ({
        label,
        value
      })),
      paymentMethodBreakdown: Array.from(paymentMethodMap.entries()).map(([label, value]) => ({
        label,
        value
      })),
      statusBreakdown: statusBreakdown.map((row) => ({
        label: row.status,
        value: row._count._all
      })),
      expiringLicenses,
      topCompanies: Array.from(topCompanies.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    });
  })
);

export { router as reportsRouter };
