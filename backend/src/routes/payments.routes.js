import express from "express";
import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const paymentSchema = z.object({
  companyId: z.string().min(1),
  licenseId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).optional().default("LYD"),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  paymentDate: z.coerce.date()
});

router.get(
  "/",
  authorize(PERMISSIONS.PAYMENT_VIEW),
  asyncHandler(async (_req, res) => {
    const items = await prisma.payment.findMany({
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
        recordedById: req.user.id
      },
      include: {
        company: true,
        license: true
      }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: "payment.create",
      entityType: "Payment",
      entityId: item.id,
      metadata: { companyId: item.companyId, amount: payload.amount }
    });

    res.status(201).json({
      item
    });
  })
);

export { router as paymentsRouter };
