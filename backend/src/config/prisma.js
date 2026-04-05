import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 5
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000
  }
});
