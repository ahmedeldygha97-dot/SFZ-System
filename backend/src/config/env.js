import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "change-this-to-a-long-random-secret",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5000",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@sfz.local",
  adminPassword: process.env.ADMIN_PASSWORD ?? "Admin@123456"
};
