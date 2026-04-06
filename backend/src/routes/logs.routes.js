import express from "express";
import { PERMISSIONS } from "../config/permissions.js";
import { prisma } from "../config/prisma.js";
import { authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAuditLogsPdf } from "../utils/pdf.js";

const router = express.Router();

function normalizeDateRange(query) {
  const from = query.from ? new Date(query.from.toString()) : null;
  const to = query.to ? new Date(query.to.toString()) : null;

  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return { from, to };
}

function buildAuditLogWhere(query) {
  const search = query.search?.toString().trim();
  const action = query.action?.toString().trim();
  const entityType = query.entityType?.toString().trim();
  const status = query.status?.toString().trim();
  const userId = query.userId?.toString().trim();
  const { from, to } = normalizeDateRange(query);

  return {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {}),
    ...(search
      ? {
          OR: [
            { userName: { contains: search, mode: "insensitive" } },
            { userRole: { contains: search, mode: "insensitive" } },
            { action: { contains: search, mode: "insensitive" } },
            { entityType: { contains: search, mode: "insensitive" } },
            { targetName: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

function escapeCsvCell(value) {
  const normalized = String(value ?? "").replaceAll('"', '""');
  return `"${normalized}"`;
}

router.get(
  "/",
  authorize(PERMISSIONS.LOG_VIEW),
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100);
    const where = buildAuditLogWhere(req.query);

    const [total, items, users, actions] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true
        },
        orderBy: { name: "asc" }
      }),
      prisma.auditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" }
      })
    ]);

    res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      },
      filters: {
        users,
        actions: actions.map((item) => item.action)
      }
    });
  })
);

router.get(
  "/export/csv",
  authorize(PERMISSIONS.LOG_VIEW),
  asyncHandler(async (req, res) => {
    const where = buildAuditLogWhere(req.query);
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000
    });

    const header = ["Timestamp", "User", "Role", "Action", "Entity", "Target", "Status", "IP", "Message"];
    const csv = [
      header.map(escapeCsvCell).join(","),
      ...rows.map((row) =>
        [
          row.createdAt.toISOString(),
          row.userName ?? "",
          row.userRole ?? "",
          row.action,
          row.entityType,
          row.targetName ?? row.entityId ?? "",
          row.status,
          row.ipAddress ?? "",
          row.message ?? ""
        ]
          .map(escapeCsvCell)
          .join(",")
      )
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  })
);

router.get(
  "/export/pdf",
  authorize(PERMISSIONS.LOG_VIEW),
  asyncHandler(async (req, res) => {
    const where = buildAuditLogWhere(req.query);
    const { from, to } = normalizeDateRange(req.query);
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const summary = {
      total: rows.length,
      success: rows.filter((row) => row.status === "SUCCESS").length,
      failed: rows.filter((row) => row.status === "FAILED").length,
      uniqueUsers: new Set(rows.map((row) => row.userId).filter(Boolean)).size
    };

    const pdf = await generateAuditLogsPdf({
      logs: rows,
      summary,
      from,
      to,
      language: req.query.lang?.toString() === "en" ? "en" : "ar"
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="audit-logs-report.pdf"');
    res.send(pdf.buffer);
  })
);

export { router as logsRouter };
