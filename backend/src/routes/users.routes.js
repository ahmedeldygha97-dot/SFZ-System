import express from "express";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { PERMISSIONS, mergeUserPermissions } from "../config/permissions.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import { getSystemSettings } from "../services/settingsService.js";

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional().default(true),
  locale: z.enum(["ar", "en"]).optional().default("ar"),
  customPermissions: z.array(z.string()).optional().default([])
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  locale: z.enum(["ar", "en"]).optional(),
  customPermissions: z.array(z.string()).optional()
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8)
});

function serializeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    permissions: mergeUserPermissions(user.role, user.customPermissions)
  };
}

function validatePasswordPolicy(settings, password) {
  if (password.length < settings.passwordMinLength) {
    throw createHttpError(400, `Password must be at least ${settings.passwordMinLength} characters.`);
  }

  if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    throw createHttpError(400, "Password must include at least one uppercase letter.");
  }

  if (settings.passwordRequireNumber && !/[0-9]/.test(password)) {
    throw createHttpError(400, "Password must include at least one number.");
  }

  if (settings.passwordRequireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    throw createHttpError(400, "Password must include at least one special character.");
  }
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
    const settings = await getSystemSettings();

    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (existing) {
      throw createHttpError(409, "A user with this email already exists.");
    }

    validatePasswordPolicy(settings, payload.password);

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        role: payload.role,
        isActive: payload.isActive,
        locale: payload.locale,
        customPermissions: payload.customPermissions,
        passwordHash
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      targetName: user.email,
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
    const settings = await getSystemSettings();
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!currentUser) {
      throw createHttpError(404, "User not found.");
    }

    const data = { ...payload };

    if (payload.email) {
      const normalizedEmail = payload.email.toLowerCase();

      if (normalizedEmail !== currentUser.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });

        if (existing && existing.id !== currentUser.id) {
          throw createHttpError(409, "A user with this email already exists.");
        }
      }

      data.email = normalizedEmail;
    }

    if (payload.password) {
      validatePasswordPolicy(settings, payload.password);
      data.passwordHash = await bcrypt.hash(payload.password, 12);
    }

    delete data.password;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "user.update",
      entityType: "User",
      entityId: user.id,
      targetName: user.email,
      metadata: payload
    });

    res.json({
      item: serializeUser(user)
    });
  })
);

router.post(
  "/:id/reset-password",
  authorize(PERMISSIONS.USER_MANAGE),
  asyncHandler(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);
    const settings = await getSystemSettings();
    const currentUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!currentUser) {
      throw createHttpError(404, "User not found.");
    }

    validatePasswordPolicy(settings, payload.newPassword);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        passwordHash: await bcrypt.hash(payload.newPassword, 12),
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "user.password.reset",
      entityType: "User",
      entityId: user.id,
      targetName: user.email
    });

    res.json({
      item: serializeUser(user)
    });
  })
);

export { router as usersRouter };
