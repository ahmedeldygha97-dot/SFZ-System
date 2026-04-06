import express from "express";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import { generateReceiptNumber } from "../services/licenseService.js";
import { generatePaymentReceiptPdf } from "../utils/pdf.js";

const router = express.Router();

const paymentSchema = z.object({
  companyId: z.string().min(1),
  licenseId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).optional().default("LYD"),
  method: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(PaymentStatus).optional().default(PaymentStatus.PAID),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentDate: z.coerce.date()
});

router.get(
  "/",
  authorize(PERMISSIONS.PAYMENT_VIEW),
  asyncHandler(async (req, res) => {
    const search = req.query.search?.toString().trim();
    const status = req.query.status?.toString().trim();

    const items = await prisma.payment.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { receiptNumber: { contains: search, mode: "insensitive" } },
                { reference: { contains: search, mode: "insensitive" } },
                { company: { nameEn: { contains: search, mode: "insensitive" } } },
                { company: { nameAr: { contains: search, mode: "insensitive" } } },
                { license: { licenseNumber: { contains: search, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        company: true,
        license: true,
        recordedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { paymentDate: "desc" }
    });

    res.json({
      items
    });
  })
);

router.post(
  "/",
  authorize(PERMISSIONS.PAYMENT_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = paymentSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { id: payload.companyId }
    });

    if (!company) {
      throw createHttpError(404, "Company not found.");
    }

    if (payload.licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: payload.licenseId }
      });

      if (!license || license.companyId !== payload.companyId) {
        throw createHttpError(400, "Selected license does not belong to the selected company.");
      }
    }

    const item = await prisma.payment.create({
      data: {
        ...payload,
        receiptNumber: await generateReceiptNumber(),
        recordedById: req.user.id
      },
      include: {
        company: true,
        license: true
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "payment.create",
      entityType: "Payment",
      entityId: item.id,
      targetName: item.receiptNumber ?? item.id,
      metadata: { companyId: item.companyId, amount: payload.amount, status: item.status }
    });

    res.status(201).json({
      item
    });
  })
);

router.get(
  "/:id/receipt",
  authorize(PERMISSIONS.PAYMENT_EXPORT),
  asyncHandler(async (req, res) => {
    const item = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        license: true,
        recordedBy: true
      }
    });

    if (!item) {
      throw createHttpError(404, "Payment not found.");
    }

    const pdf = await generatePaymentReceiptPdf({
      payment: item,
      company: item.company,
      license: item.license,
      language: req.query.lang?.toString() === "en" ? "en" : "ar"
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "payment.receipt.generate",
      entityType: "Payment",
      entityId: item.id,
      targetName: item.receiptNumber ?? item.id
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${item.receiptNumber ?? item.id}.pdf"`);
    res.send(pdf.buffer);
  })
);

export { router as paymentsRouter };
