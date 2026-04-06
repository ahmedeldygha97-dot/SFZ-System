import express from "express";
import { LicenseStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import {
  buildVerificationUrl,
  createPublicId,
  generateLicenseNumber,
  generateReceiptNumber,
  recordLicenseStatusHistory,
  syncExpiredLicenses
} from "../services/licenseService.js";
import { generateLicensePdf } from "../utils/pdf.js";

const router = express.Router();

const licenseSchema = z.object({
  companyId: z.string().min(1),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  durationMonths: z.coerce.number().int().min(1).max(60).optional().nullable(),
  issuingAuthority: z.string().optional().nullable(),
  activities: z.string().optional().nullable(),
  feeAmount: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
  markAsPaid: z.boolean().optional().default(false),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentReference: z.string().optional().nullable()
});

const renewSchema = z.object({
  newExpiryDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
  markAsPaid: z.boolean().optional().default(false),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentReference: z.string().optional().nullable()
});

const updateSchema = licenseSchema.partial();

const statusSchema = z.object({
  reason: z.string().optional().nullable()
});

function calculateDurationMonths(issueDate, expiryDate) {
  const start = new Date(issueDate);
  const end = new Date(expiryDate);
  return Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()), 1);
}

function resolveLicenseStatus(expiryDate) {
  const now = new Date();
  const expiringSoonDate = new Date();
  expiringSoonDate.setDate(expiringSoonDate.getDate() + 30);

  if (new Date(expiryDate) < now) {
    return LicenseStatus.EXPIRED;
  }

  if (new Date(expiryDate) <= expiringSoonDate) {
    return LicenseStatus.EXPIRING_SOON;
  }

  return LicenseStatus.ACTIVE;
}

async function loadLicense(id) {
  return prisma.license.findUnique({
    where: { id },
    include: {
      company: true,
      payments: {
        orderBy: { paymentDate: "desc" }
      },
      renewals: {
        orderBy: { renewedAt: "desc" }
      },
      attachments: {
        orderBy: { createdAt: "desc" }
      },
      statusHistory: {
        orderBy: { changedAt: "desc" },
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      }
    }
  });
}

router.get(
  "/",
  authorize(PERMISSIONS.LICENSE_VIEW),
  asyncHandler(async (req, res) => {
    await syncExpiredLicenses();

    const search = req.query.search?.toString().trim();
    const status = req.query.status?.toString().trim();
    const companyId = req.query.companyId?.toString().trim();

    const items = await prisma.license.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
        ...(search
          ? {
              OR: [
                { licenseNumber: { contains: search, mode: "insensitive" } },
                { activities: { contains: search, mode: "insensitive" } },
                { issuingAuthority: { contains: search, mode: "insensitive" } },
                { company: { nameEn: { contains: search, mode: "insensitive" } } },
                { company: { nameAr: { contains: search, mode: "insensitive" } } },
                { company: { tradeName: { contains: search, mode: "insensitive" } } },
                { company: { registrationNumber: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        company: true,
        renewals: {
          orderBy: { renewedAt: "desc" }
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 3
        },
        _count: {
          select: {
            attachments: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      items
    });
  })
);

router.get(
  "/:id",
  authorize(PERMISSIONS.LICENSE_VIEW),
  asyncHandler(async (req, res) => {
    await syncExpiredLicenses();
    const item = await loadLicense(req.params.id);

    if (!item) {
      throw createHttpError(404, "License not found.");
    }

    res.json({ item });
  })
);

router.post(
  "/",
  authorize(PERMISSIONS.LICENSE_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = licenseSchema.parse(req.body);

    if (payload.expiryDate <= payload.issueDate) {
      throw createHttpError(400, "Expiry date must be after issue date.");
    }

    const company = await prisma.company.findUnique({
      where: { id: payload.companyId }
    });

    if (!company) {
      throw createHttpError(404, "Company not found.");
    }

    const publicId = createPublicId();
    const licenseNumber = await generateLicenseNumber();
    const verificationUrl = buildVerificationUrl(publicId);
    const status = resolveLicenseStatus(payload.expiryDate);

    const result = await prisma.license.create({
      data: {
        companyId: payload.companyId,
        licenseNumber,
        publicId,
        qrCodeUrl: verificationUrl,
        issueDate: payload.issueDate,
        expiryDate: payload.expiryDate,
        durationMonths: payload.durationMonths || calculateDurationMonths(payload.issueDate, payload.expiryDate),
        issuingAuthority: payload.issuingAuthority,
        activities: payload.activities,
        feeAmount: payload.feeAmount,
        notes: payload.notes,
        status,
        createdById: req.user.id
      },
      include: {
        company: true,
        renewals: true
      }
    });

    await recordLicenseStatusHistory({
      licenseId: result.id,
      status,
      changedById: req.user.id,
      reason: "License issued."
    });

    if (payload.markAsPaid) {
      try {
        await prisma.payment.create({
          data: {
            receiptNumber: await generateReceiptNumber(),
            companyId: payload.companyId,
            licenseId: result.id,
            amount: payload.feeAmount,
            method: payload.paymentMethod ?? PaymentMethod.CASH,
            status: PaymentStatus.PAID,
            reference: payload.paymentReference,
            paymentDate: payload.issueDate,
            recordedById: req.user.id
          }
        });
      } catch (paymentError) {
        await prisma.license.delete({
          where: { id: result.id }
        });

        throw paymentError;
      }
    }

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.create",
      entityType: "License",
      entityId: result.id,
      targetName: result.licenseNumber,
      metadata: { companyId: result.companyId, status: result.status }
    });

    res.status(201).json({
      item: await loadLicense(result.id)
    });
  })
);

router.patch(
  "/:id",
  authorize(PERMISSIONS.LICENSE_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = updateSchema.parse(req.body);
    const {
      markAsPaid: _markAsPaid,
      paymentMethod: _paymentMethod,
      paymentReference: _paymentReference,
      ...licensePayload
    } = payload;
    const existing = await prisma.license.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw createHttpError(404, "License not found.");
    }

    const nextIssueDate = licensePayload.issueDate ?? existing.issueDate;
    const nextExpiryDate = licensePayload.expiryDate ?? existing.expiryDate;

    if (new Date(nextExpiryDate) <= new Date(nextIssueDate)) {
      throw createHttpError(400, "Expiry date must be after issue date.");
    }

    const nextStatus =
      existing.status === LicenseStatus.SUSPENDED || existing.status === LicenseStatus.REVOKED
        ? existing.status
        : resolveLicenseStatus(nextExpiryDate);

    const item = await prisma.license.update({
      where: { id: req.params.id },
      data: {
        ...licensePayload,
        durationMonths:
          licensePayload.durationMonths ??
          calculateDurationMonths(nextIssueDate, nextExpiryDate),
        status: nextStatus
      }
    });

    if (item.status !== existing.status) {
      await recordLicenseStatusHistory({
        licenseId: item.id,
        status: item.status,
        changedById: req.user.id,
        reason: "License details updated."
      });
    }

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.update",
      entityType: "License",
      entityId: item.id,
      targetName: item.licenseNumber,
      metadata: licensePayload
    });

    res.json({ item: await loadLicense(item.id) });
  })
);

router.patch(
  "/:id/renew",
  authorize(PERMISSIONS.LICENSE_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = renewSchema.parse(req.body);
    const existing = await prisma.license.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!existing) {
      throw createHttpError(404, "License not found.");
    }

    if (payload.newExpiryDate <= existing.expiryDate) {
      throw createHttpError(400, "New expiry date must be later than the current expiry date.");
    }

    const nextStatus = resolveLicenseStatus(payload.newExpiryDate);
    const renewalOperations = [
      prisma.licenseRenewal.create({
        data: {
          licenseId: existing.id,
          previousExpiryDate: existing.expiryDate,
          newExpiryDate: payload.newExpiryDate,
          amount: payload.amount,
          notes: payload.notes,
          processedById: req.user.id
        }
      }),
      prisma.license.update({
        where: { id: existing.id },
        data: {
          expiryDate: payload.newExpiryDate,
          durationMonths: calculateDurationMonths(existing.issueDate, payload.newExpiryDate),
          feeAmount: payload.amount,
          notes: payload.notes ?? existing.notes,
          status: nextStatus
        }
      })
    ];

    if (payload.markAsPaid) {
      renewalOperations.push(
        prisma.payment.create({
          data: {
            receiptNumber: await generateReceiptNumber(),
            companyId: existing.companyId,
            licenseId: existing.id,
            amount: payload.amount,
            method: payload.paymentMethod ?? PaymentMethod.CASH,
            status: PaymentStatus.PAID,
            reference: payload.paymentReference,
            paymentDate: new Date(),
            recordedById: req.user.id
          }
        })
      );
    }

    await prisma.$transaction(renewalOperations);
    await recordLicenseStatusHistory({
      licenseId: existing.id,
      status: nextStatus,
      changedById: req.user.id,
      reason: "License renewed."
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.renew",
      entityType: "License",
      entityId: existing.id,
      targetName: existing.licenseNumber,
      metadata: { newExpiryDate: payload.newExpiryDate.toISOString(), amount: payload.amount }
    });

    const item = await loadLicense(existing.id);
    res.json({ item });
  })
);

router.patch(
  "/:id/suspend",
  authorize(PERMISSIONS.LICENSE_STATUS_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = statusSchema.parse(req.body);
    const existing = await prisma.license.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw createHttpError(404, "License not found.");
    }

    const item = await prisma.license.update({
      where: { id: existing.id },
      data: {
        status: LicenseStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: payload.reason ?? null
      }
    });

    await recordLicenseStatusHistory({
      licenseId: item.id,
      status: LicenseStatus.SUSPENDED,
      changedById: req.user.id,
      reason: payload.reason ?? "License suspended."
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.suspend",
      entityType: "License",
      entityId: item.id,
      targetName: item.licenseNumber,
      metadata: payload
    });

    res.json({ item: await loadLicense(item.id) });
  })
);

router.patch(
  "/:id/reactivate",
  authorize(PERMISSIONS.LICENSE_STATUS_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = statusSchema.parse(req.body);
    const existing = await prisma.license.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw createHttpError(404, "License not found.");
    }

    const status = resolveLicenseStatus(existing.expiryDate);
    const item = await prisma.license.update({
      where: { id: existing.id },
      data: {
        status,
        suspendedAt: null,
        suspendedReason: null
      }
    });

    await recordLicenseStatusHistory({
      licenseId: item.id,
      status,
      changedById: req.user.id,
      reason: payload.reason ?? "License reactivated."
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.reactivate",
      entityType: "License",
      entityId: item.id,
      targetName: item.licenseNumber,
      metadata: payload
    });

    res.json({ item: await loadLicense(item.id) });
  })
);

router.get(
  "/:id/pdf",
  authorize(PERMISSIONS.LICENSE_EXPORT),
  asyncHandler(async (req, res) => {
    await syncExpiredLicenses();
    const item = await loadLicense(req.params.id);

    if (!item) {
      throw createHttpError(404, "License not found.");
    }

    const verificationUrl = item.qrCodeUrl || buildVerificationUrl(item.publicId);
    const pdf = await generateLicensePdf({
      license: item,
      company: item.company,
      verificationUrl,
      language: req.query.lang?.toString() === "en" ? "en" : "ar"
    });

    await prisma.license.update({
      where: { id: item.id },
      data: {
        pdfPath: pdf.relativePath,
        qrCodeUrl: verificationUrl,
        lastGeneratedAt: new Date()
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "license.pdf.generate",
      entityType: "License",
      entityId: item.id,
      targetName: item.licenseNumber
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${item.licenseNumber}.pdf"`);
    res.send(pdf.buffer);
  })
);

export { router as licensesRouter };
