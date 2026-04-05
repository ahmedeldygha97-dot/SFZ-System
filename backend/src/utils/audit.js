import { prisma } from "../config/prisma.js";

export async function writeAuditLog({ userId, action, entityType, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata
      }
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
