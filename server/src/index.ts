import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import path from "path";
import { loadEnv } from "./config/env";
import { connectDb } from "./config/db";
import { authRouter } from "./routes/auth";
import { uploadsRouter } from "./routes/uploads";
import { statsRouter } from "./routes/stats";
import { adminRouter } from "./routes/admin";
import { errorHandler, notFound } from "./middleware/errorHandler";

async function main() {
  const env = loadEnv();
  await connectDb(env);

  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      credentials: false
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200
    }),
    authRouter
  );
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/admin", adminRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

