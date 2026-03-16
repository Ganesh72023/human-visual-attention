import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().optional().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().optional().default("1h"),
  CORS_ORIGIN: z.string().optional().default("http://localhost:5173"),
  // ML service config:
  // Prefer ML_SERVICE_URL. If unset, we can build it from ML_SERVICE_SCHEME + ML_SERVICE_HOSTPORT.
  ML_SERVICE_URL: z.string().optional(),
  ML_SERVICE_SCHEME: z.string().optional().default("http"),
  ML_SERVICE_HOSTPORT: z.string().optional(),
  UPLOAD_DIR: z.string().optional().default("uploads"),
  MAX_IMAGE_MB: z.coerce.number().optional().default(25),
  MAX_VIDEO_MB: z.coerce.number().optional().default(200),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().optional().default("Admin")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}
