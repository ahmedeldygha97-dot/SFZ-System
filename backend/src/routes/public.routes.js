import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { syncExpiredLicenses } from "../services/licenseService.js";

const router = express.Router();

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
        status: item.status,
        qrCodeUrl: item.qrCodeUrl,
        company: {
          nameEn: item.company.nameEn,
          nameAr: item.company.nameAr,
          registrationNumber: item.company.registrationNumber,
          ownerName: item.company.ownerName,
          city: item.company.city,
          commercialActivity: item.company.commercialActivity
        }
      }
    });
  })
);

export { router as publicRouter };
