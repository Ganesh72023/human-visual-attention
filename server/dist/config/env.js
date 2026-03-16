"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().optional().default("development"),
    PORT: zod_1.z.coerce.number().optional().default(5000),
    MONGODB_URI: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(16),
    JWT_EXPIRES_IN: zod_1.z.string().optional().default("1h"),
    CORS_ORIGIN: zod_1.z.string().optional().default("http://localhost:5173"),
    // ML service config:
    // Prefer ML_SERVICE_URL. If unset, we can build it from ML_SERVICE_SCHEME + ML_SERVICE_HOSTPORT.
    ML_SERVICE_URL: zod_1.z.string().optional(),
    ML_SERVICE_SCHEME: zod_1.z.string().optional().default("http"),
    ML_SERVICE_HOSTPORT: zod_1.z.string().optional(),
    UPLOAD_DIR: zod_1.z.string().optional().default("uploads"),
    MAX_IMAGE_MB: zod_1.z.coerce.number().optional().default(25),
    MAX_VIDEO_MB: zod_1.z.coerce.number().optional().default(200),
    ADMIN_EMAIL: zod_1.z.string().email().optional(),
    ADMIN_PASSWORD: zod_1.z.string().min(8).optional(),
    ADMIN_NAME: zod_1.z.string().optional().default("Admin")
});
function loadEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        // eslint-disable-next-line no-console
        console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
        throw new Error("Invalid environment variables");
    }
    return parsed.data;
}
