import express from "express";
import { buildPublicSettingsPayload, getSystemSettings } from "../services/settingsService.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { syncExpiredLicenses } from "../services/licenseService.js";

const router = express.Router();

router.get(
  "/system",
  asyncHandler(async (_req, res) => {
    const settings = await getSystemSettings();
    res.json({
      item: buildPublicSettingsPayload(settings)
    });
  })
);

router.get(
  "/licenses/:publicId",
  asyncHandler(async (req, res) => {
    await syncExpiredLicenses();

    const item = await prisma.license.findUnique({
      where: {
        publicId: req.params.publicId
      },
      include: {
        company: true
      }
    });

    if (!item) {
      throw createHttpError(404, "License not found.");
    }

    res.json({
      item: {
        publicId: item.publicId,
        licenseNumber: item.licenseNumber,
        issueDate: item.issueDate,
        expiryDate: item.expiryDate,
        durationMonths: item.durationMonths,
        issuingAuthority: item.issuingAuthority,
        activities: item.activities,
        status: item.status,
        qrCodeUrl: item.qrCodeUrl,
        company: {
          nameEn: item.company.nameEn,
          nameAr: item.company.nameAr,
          tradeName: item.company.tradeName,
          legalForm: item.company.legalForm,
          registrationNumber: item.company.registrationNumber,
          ownerName: item.company.ownerName,
          managerName: item.company.managerName,
          city: item.company.city,
          areaName: item.company.areaName,
          address: item.company.address,
          commercialActivity: item.company.commercialActivity
        }
      }
    });
  })
);

export { router as publicRouter };
