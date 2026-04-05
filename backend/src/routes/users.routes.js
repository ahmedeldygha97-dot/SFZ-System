import express from "express";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS, getRolePermissions } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

function serializeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    permissions: getRolePermissions(user.role)
  };
}

router.get(
  "/",
  authorize(PERMISSIONS.USER_VIEW),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }
    });

    res.json({
      items: users.map(serializeUser)
    });
  })
);

router.post(
  "/",
  authorize(PERMISSIONS.USER_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (existing) {
      throw createHttpError(409, "A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: payload.role,
        isActive: payload.isActive,
        passwordHash
      }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, role: user.role }
    });

    res.status(201).json({
      item: serializeUser(user)
    });
  })
);

router.patch(
  "/:id",
  authorize(PERMISSIONS.USER_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = updateUserSchema.parse(req.body);
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!currentUser) {
      throw createHttpError(404, "User not found.");
    }

    const data = { ...payload };

    if (payload.email) {
      data.email = payload.email.toLowerCase();
    }

    if (payload.password) {
      data.passwordHash = await bcrypt.hash(payload.password, 12);
    }

    delete data.password;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });

    await writeAuditLog({
      userId: req.user.id,
      action: "user.update",
      entityType: "User",
      entityId: user.id,
      metadata: payload
    });

    res.json({
      item: serializeUser(user)
    });
  })
);

export { router as usersRouter };
