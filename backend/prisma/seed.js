import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sfz.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123456";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "System Administrator",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      passwordHash: adminHash
    },
    create: {
      name: "System Administrator",
      email: adminEmail,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      passwordHash: adminHash
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed successfully.");
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
