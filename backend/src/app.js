import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { companiesRouter } from "./routes/companies.routes.js";
import { licensesRouter } from "./routes/licenses.routes.js";
import { paymentsRouter } from "./routes/payments.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(compression());
app.use(
  cors({
    origin: env.nodeEnv === "development" ? true : [env.appBaseUrl, env.clientUrl],
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sfz-system",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/public", publicRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/companies", requireAuth, companiesRouter);
app.use("/api/licenses", requireAuth, licensesRouter);
app.use("/api/payments", requireAuth, paymentsRouter);
app.use("/api", notFoundHandler);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, { index: false }));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use(errorHandler);
