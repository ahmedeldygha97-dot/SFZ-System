import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import { generateCompanyRegistrationNumber } from "../services/licenseService.js";
import { generateCompanyPdf } from "../utils/pdf.js";

const router = express.Router();

const companySchema = z.object({
  registrationNumber: z.string().min(4).optional(),
  nameEn: z.string().min(2),
  nameAr: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  legalForm: z.string().optional().nullable(),
  ownerName: z.string().min(2),
  managerName: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  commercialActivity: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  areaName: z.string().optional().nullable(),
  buildingName: z.string().optional().nullable(),
  premisesNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "CLOSED"]).optional()
});

router.get(
  "/",
  authorize(PERMISSIONS.COMPANY_VIEW),
  asyncHandler(async (req, res) => {
    const search = req.query.search?.toString().trim();
    const status = req.query.status?.toString().trim();

    const items = await prisma.company.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { nameEn: { contains: search, mode: "insensitive" } },
                { nameAr: { contains: search, mode: "insensitive" } },
                { tradeName: { contains: search, mode: "insensitive" } },
                { legalForm: { contains: search, mode: "insensitive" } },
                { ownerName: { contains: search, mode: "insensitive" } },
                { managerName: { contains: search, mode: "insensitive" } },
                { registrationNumber: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(status ? { status } : {})
      },
      include: {
        licenses: {
          orderBy: { createdAt: "desc" },
          take: 1
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
  authorize(PERMISSIONS.COMPANY_VIEW),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        licenses: {
          orderBy: { createdAt: "desc" },
          include: {
            statusHistory: {
              orderBy: { changedAt: "desc" }
            },
            renewals: {
              orderBy: { renewedAt: "desc" }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            license: true
          }
        }
      }
    });

    if (!company) {
      throw createHttpError(404, "Company not found.");
    }

    res.json({ item: company });
  })
);

router.post(
  "/",
  authorize(PERMISSIONS.COMPANY_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = companySchema.parse(req.body);
    const registrationNumber = payload.registrationNumber || (await generateCompanyRegistrationNumber());

    const company = await prisma.company.create({
      data: {
        ...payload,
        registrationNumber,
        email: payload.email || null,
        createdById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      targetName: company.nameAr || company.nameEn,
      metadata: { registrationNumber: company.registrationNumber }
    });

    res.status(201).json({
      item: company
    });
  })
);

router.patch(
  "/:id",
  authorize(PERMISSIONS.COMPANY_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = companySchema.partial().parse(req.body);

    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: {
        ...payload,
        email: payload.email === "" ? null : payload.email
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "company.update",
      entityType: "Company",
      entityId: company.id,
      targetName: company.nameAr || company.nameEn,
      metadata: payload
    });

    res.json({ item: company });
  })
);

router.get(
  "/:id/pdf",
  authorize(PERMISSIONS.COMPANY_EXPORT),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" }
        },
        licenses: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    if (!company) {
      throw createHttpError(404, "Company not found.");
    }

    const pdf = await generateCompanyPdf({
      company,
      language: req.query.lang?.toString() === "en" ? "en" : "ar"
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "company.pdf.generate",
      entityType: "Company",
      entityId: company.id,
      targetName: company.nameAr || company.nameEn
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${company.registrationNumber}.pdf"`);
    res.send(pdf.buffer);
  })
);

export { router as companiesRouter };
