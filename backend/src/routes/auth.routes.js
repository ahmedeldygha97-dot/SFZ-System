import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { getRolePermissions } from "../config/permissions.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createHttpError } from "../utils/httpError.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function serializeUser(user) {
  const { passwordHash, ...safeUser } = user;

  return {
    ...safeUser,
    permissions: getRolePermissions(user.role)
  };
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });

    if (!user || !user.isActive) {
      throw createHttpError(401, "Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw createHttpError(401, "Invalid email or password.");
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
      expiresIn: "12h"
    });

    await writeAuditLog({
      userId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id
    });

    res.json({
      token,
      user: serializeUser(user)
    });
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
