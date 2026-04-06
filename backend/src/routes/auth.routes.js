import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ActivityStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { mergeUserPermissions } from "../config/permissions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";
import { getSystemSettings } from "../services/settingsService.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function serializeUser(user) {
  const { passwordHash, ...safeUser } = user;

  return {
    ...safeUser,
    permissions: mergeUserPermissions(user.role, user.customPermissions)
  };
}

function buildLockoutDate(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const settings = await getSystemSettings();
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user || !user.isActive) {
      await writeAuditLog({
        req,
        action: "auth.login.failed",
        entityType: "User",
        targetName: normalizedEmail,
        status: ActivityStatus.FAILED,
        message: "Unknown or inactive account."
      });

      throw createHttpError(401, "Invalid email or password.");
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      await writeAuditLog({
        req,
        user,
        userId: user.id,
        action: "auth.login.locked",
        entityType: "User",
        entityId: user.id,
        targetName: user.email,
        status: ActivityStatus.FAILED,
        message: "Login blocked because the account is locked."
      });

      throw createHttpError(423, "This account is temporarily locked.");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempts >= settings.lockoutAttempts;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextAttempts,
          lockedUntil: shouldLock ? buildLockoutDate(settings.lockoutDurationMinutes) : null
        }
      });

      await writeAuditLog({
        req,
        user,
        userId: user.id,
        action: "auth.login.failed",
        entityType: "User",
        entityId: user.id,
        targetName: user.email,
        status: ActivityStatus.FAILED,
        message: shouldLock
          ? "Invalid password. The account was temporarily locked."
          : "Invalid password."
      });

      throw createHttpError(401, "Invalid email or password.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastSeenAt: new Date()
      }
    });

    const token = jwt.sign({ userId: updatedUser.id, role: updatedUser.role }, env.jwtSecret, {
      expiresIn: `${settings.sessionTimeoutMinutes}m`
    });

    await writeAuditLog({
      req,
      user: updatedUser,
      userId: updatedUser.id,
      action: "auth.login",
      entityType: "User",
      entityId: updatedUser.id,
      targetName: updatedUser.email
    });

    res.json({
      token,
      user: serializeUser(updatedUser)
    });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await writeAuditLog({
      req,
      user: req.user,
      userId: req.user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: req.user.id,
      targetName: req.user.email
    });

    res.json({ success: true });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: serializeUser(req.user)
    });
  })
);

export { router as authRouter };
