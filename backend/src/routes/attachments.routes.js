import path from "path";
import express from "express";
import { AttachmentCategory, AttachmentEntityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import { resolveProjectRoot, resolveUploadsPath, saveBase64File } from "../utils/storage.js";

const router = express.Router();

const uploadSchema = z.object({
  entityType: z.nativeEnum(AttachmentEntityType),
  companyId: z.string().optional().nullable(),
  licenseId: z.string().optional().nullable(),
  category: z.nativeEnum(AttachmentCategory).optional().default(AttachmentCategory.OTHER),
  fileName: z.string().min(3),
  mimeType: z.string().min(3),
  contentBase64: z.string().min(10),
  notes: z.string().optional().nullable()
});

router.get(
  "/",
  authorize(PERMISSIONS.ATTACHMENT_VIEW),
  asyncHandler(async (req, res) => {
    const companyId = req.query.companyId?.toString().trim();
    const licenseId = req.query.licenseId?.toString().trim();
    const entityType = req.query.entityType?.toString().trim();

    const items = await prisma.attachment.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(licenseId ? { licenseId } : {}),
        ...(entityType ? { entityType } : {})
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ items });
  })
);

router.post(
  "/",
  authorize(PERMISSIONS.ATTACHMENT_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = uploadSchema.parse(req.body);

    if (payload.entityType === AttachmentEntityType.COMPANY && !payload.companyId) {
      throw createHttpError(400, "companyId is required for company attachments.");
    }

    if (payload.entityType === AttachmentEntityType.LICENSE && !payload.licenseId) {
      throw createHttpError(400, "licenseId is required for license attachments.");
    }

    const targetDirectory =
      payload.entityType === AttachmentEntityType.COMPANY
        ? resolveUploadsPath("company-files")
        : resolveUploadsPath("license-files");
    const file = await saveBase64File({
      targetDirectory,
      originalName: payload.fileName,
      contentBase64: payload.contentBase64
    });

    const relativePath = path.relative(resolveProjectRoot(), file.absolutePath).replace(/\\/g, "/");
    const item = await prisma.attachment.create({
      data: {
        entityType: payload.entityType,
        category: payload.category,
        companyId: payload.companyId || null,
        licenseId: payload.licenseId || null,
        fileName: file.storedFileName,
        originalName: payload.fileName,
        mimeType: payload.mimeType,
        fileSize: file.buffer.length,
        filePath: relativePath,
        notes: payload.notes,
        uploadedById: req.user.id
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "attachment.upload",
      entityType: "Attachment",
      entityId: item.id,
      targetName: item.originalName,
      metadata: {
        entityType: item.entityType,
        companyId: item.companyId,
        licenseId: item.licenseId
      }
    });

    res.status(201).json({ item });
  })
);

router.get(
  "/:id/download",
  authorize(PERMISSIONS.ATTACHMENT_VIEW),
  asyncHandler(async (req, res) => {
    const item = await prisma.attachment.findUnique({
      where: { id: req.params.id }
    });

    if (!item) {
      throw createHttpError(404, "Attachment not found.");
    }

    res.download(path.resolve(resolveProjectRoot(), item.filePath), item.originalName);
  })
);

export { router as attachmentsRouter };
