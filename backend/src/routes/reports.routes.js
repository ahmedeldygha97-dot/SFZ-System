import express from "express";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { syncExpiredLicenses } from "../services/licenseService.js";
import { generateCommercialReportPdf } from "../utils/pdf.js";

const router = express.Router();

async function buildAnalytics(from, to, expiringDays, filters = {}) {
  await syncExpiredLicenses();
  const { companyId = "", status = "" } = filters;

  const expiringUntil = new Date();
  expiringUntil.setDate(expiringUntil.getDate() + expiringDays);

  const licenseWhere = {
    ...(companyId ? { companyId } : {}),
    ...(status ? { status } : {})
  };

  const companyWhere = {
    ...(companyId ? { id: companyId } : {}),
    ...(status
      ? {
          licenses: {
            some: {
              status
            }
          }
        }
      : {})
  };

  const [payments, expiringLicenses, statusBreakdown, companies, totalLicenses, activitySummary] = await Promise.all([
    prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: from,
          lte: to
        },
        ...(companyId ? { companyId } : {}),
        ...(status
          ? {
              license: {
                is: {
                  status
                }
              }
            }
          : {})
      },
      include: {
        company: true,
        license: true
      },
      orderBy: { paymentDate: "asc" }
    }),
    prisma.license.findMany({
      where: {
        ...licenseWhere,
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
      where: licenseWhere,
      by: ["status"],
      _count: {
        _all: true
      }
    }),
    prisma.company.findMany({
      where: companyWhere,
      include: {
        licenses: {
          ...(status
            ? {
                where: {
                  status
                }
              }
            : {}),
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.license.count({ where: licenseWhere }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: {
          gte: from,
          lte: to
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  const monthlyRevenueMap = new Map();
  const paymentMethodMap = new Map();
  const topCompanies = new Map();
  const paidLicenseIds = new Set();

  payments.forEach((payment) => {
    const monthKey = new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric"
    }).format(new Date(payment.paymentDate));

    monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) ?? 0) + Number(payment.amount));
    paymentMethodMap.set(payment.method, (paymentMethodMap.get(payment.method) ?? 0) + Number(payment.amount));
    topCompanies.set(payment.company.nameEn, (topCompanies.get(payment.company.nameEn) ?? 0) + Number(payment.amount));
    if (payment.status === PaymentStatus.PAID && payment.licenseId) {
      paidLicenseIds.add(payment.licenseId);
    }
  });

  const paidCount = paidLicenseIds.size;
  const unpaidCount = Math.max(totalLicenses - paidCount, 0);

  return {
    summary: {
      totalCompanies: companies.length,
      totalLicenses,
      paidCount,
      unpaidCount,
      revenue: payments.reduce((sum, item) => sum + Number(item.amount), 0)
    },
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
    companies,
    activitySummary: activitySummary.map((row) => ({
      label: row.action,
      value: row._count._all
    })),
    topCompanies: Array.from(topCompanies.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  };
}

router.get(
  "/analytics",
  authorize(PERMISSIONS.REPORT_VIEW),
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(req.query.from.toString()) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to.toString()) : new Date();
    const expiringDays = Number(req.query.expiringDays ?? 45);
    const filters = {
      companyId: req.query.companyId?.toString().trim() ?? "",
      status: req.query.status?.toString().trim() ?? ""
    };
    const payload = await buildAnalytics(from, to, expiringDays, filters);

    res.json(payload);
  })
);

router.get(
  "/analytics/pdf",
  authorize(PERMISSIONS.REPORT_EXPORT),
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(req.query.from.toString()) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to.toString()) : new Date();
    const expiringDays = Number(req.query.expiringDays ?? 45);
    const filters = {
      companyId: req.query.companyId?.toString().trim() ?? "",
      status: req.query.status?.toString().trim() ?? ""
    };
    const analytics = await buildAnalytics(from, to, expiringDays, filters);
    const pdf = await generateCommercialReportPdf({
      analytics,
      from,
      to,
      language: req.query.lang?.toString() === "en" ? "en" : "ar"
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="commercial-license-report.pdf"');
    res.send(pdf.buffer);
  })
);

export { router as reportsRouter };
