import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { mergeUserPermissions } from "../config/permissions.js";
import { createHttpError } from "../utils/httpError.js";

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw createHttpError(401, "Authentication required.");
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, env.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.isActive) {
      throw createHttpError(401, "Invalid or inactive account.");
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw createHttpError(423, "This account is temporarily locked.");
    }

    req.user = {
      ...user,
      permissions: mergeUserPermissions(user.role, user.customPermissions)
    };

    prisma.user
      .update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() }
      })
      .catch(() => null);

    next();
  } catch (error) {
    next(error.status ? error : createHttpError(401, "Invalid authentication token."));
  }
}

export function authorize(...permissions) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required."));
    }

    const missing = permissions.some((permission) => !req.user.permissions.includes(permission));

    if (missing) {
      return next(createHttpError(403, "You do not have permission to perform this action."));
    }

    return next();
  };
}
