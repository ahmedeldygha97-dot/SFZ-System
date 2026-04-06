import { ActivityStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";

function resolveIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req?.ip ?? null;
}

export async function writeAuditLog({
  req,
  user,
  userId,
  action,
  entityType,
  entityId,
  targetName,
  status = ActivityStatus.SUCCESS,
  message,
  metadata
}) {
  try {
    const resolvedUserId = user?.id ?? userId ?? null;
    const persistedUser = resolvedUserId
      ? await prisma.user.findUnique({
          where: { id: resolvedUserId },
          select: {
            id: true,
            name: true,
            role: true
          }
        })
      : null;

    await prisma.auditLog.create({
      data: {
        userId: persistedUser?.id ?? null,
        userName: user?.name ?? persistedUser?.name ?? null,
        userRole: user?.role ?? persistedUser?.role ?? null,
        action,
        entityType,
        entityId,
        targetName,
        ipAddress: resolveIp(req),
        status,
        message,
        metadata
      }
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
