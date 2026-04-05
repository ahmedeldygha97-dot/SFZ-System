import express from "express";
import { LicenseStatus, PaymentMethod } from "@prisma/client";
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
  syncExpiredLicenses
} from "../services/licenseService.js";
import { generateLicensePdf } from "../utils/pdf.js";

const router = express.Router();

const licenseSchema = z.object({
  companyId: z.string().min(1),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
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
                { company: { nameEn: { contains: search, mode: "insensitive" } } },
                { company: { registrationNumber: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        company: true,
        renewals: {
          orderBy: { renewedAt: "desc" }
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
    const verificationUrl = buildVerificationUrl(publicId);

    const result = await prisma.$transaction(async (tx) => {
      const license = await tx.license.create({
        data: {
          companyId: payload.companyId,
          licenseNumber: await generateLicenseNumber(),
          publicId,
          qrCodeUrl: verificationUrl,
          issueDate: payload.issueDate,
          expiryDate: payload.expiryDate,
          feeAmount: payload.feeAmount,
          notes: payload.notes,
          status: LicenseStatus.ACTIVE,
          createdById: req.user.id
        },
        include: {
          company: true,
          renewals: true
        }
      });

      if (payload.markAsPaid) {
        await tx.payment.create({
          data: {
            companyId: payload.companyId,
            licenseId: license.id,
            amount: payload.feeAmount,
            method: payload.paymentMethod ?? PaymentMethod.CASH,
            reference: payload.paymentReference,
            paymentDate: payload.issueDate,
            recordedById: req.user.id
          }
        });
      }

      return license;
    });

    await writeAuditLog({
      userId: req.user.id,
      action: "license.create",
      entityType: "License",
      entityId: result.id,
      metadata: { licenseNumber: result.licenseNumber, companyId: result.companyId }
    });

    res.status(201).json({
      item: result
    });
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

    await prisma.$transaction(async (tx) => {
      await tx.licenseRenewal.create({
        data: {
          licenseId: existing.id,
          previousExpiryDate: existing.expiryDate,
          newExpiryDate: payload.newExpiryDate,
          amount: payload.amount,
          notes: payload.notes,
          processedById: req.user.id
        }
      });

      await tx.license.update({
        where: { id: existing.id },
        data: {
          expiryDate: payload.newExpiryDate,
          feeAmount: payload.amount,
          notes: payload.notes ?? existing.notes,
          status: LicenseStatus.ACTIVE
        }
      });

      if (payload.markAsPaid) {
        await tx.payment.create({
          data: {
            companyId: existing.companyId,
            licenseId: existing.id,
            amount: payload.amount,
            method: payload.paymentMethod ?? PaymentMethod.CASH,
            reference: payload.paymentReference,
            paymentDate: new Date(),
            recordedById: req.user.id
          }
        });
      }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: "license.renew",
      entityType: "License",
      entityId: existing.id,
      metadata: { newExpiryDate: payload.newExpiryDate.toISOString(), amount: payload.amount }
    });

    const item = await loadLicense(existing.id);
    res.json({ item });
  })
);

router.get(
  "/:id/pdf",
  authorize(PERMISSIONS.LICENSE_VIEW),
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
      verificationUrl
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
      userId: req.user.id,
      action: "license.pdf.generate",
      entityType: "License",
      entityId: item.id
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${item.licenseNumber}.pdf"`);
    res.send(pdf.buffer);
  })
);

export { router as licensesRouter };
