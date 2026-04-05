import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export async function ensureDefaultAdmin() {
  const totalUsers = await prisma.user.count();

  if (totalUsers > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);

  await prisma.user.create({
    data: {
      name: "System Administrator",
      email: env.adminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true
    }
  });

  console.log(`Default admin created: ${env.adminEmail}`);
}
