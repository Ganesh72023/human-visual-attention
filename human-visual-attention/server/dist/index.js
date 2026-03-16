"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const auth_1 = require("./routes/auth");
const uploads_1 = require("./routes/uploads");
const stats_1 = require("./routes/stats");
const admin_1 = require("./routes/admin");
const errorHandler_1 = require("./middleware/errorHandler");
async function main() {
    const env = (0, env_1.loadEnv)();
    await (0, db_1.connectDb)(env);
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, cors_1.default)({
        origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
        credentials: false
    }));
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json({ limit: "2mb" }));
    app.use((0, morgan_1.default)("dev"));
    app.use("/api/auth", (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 200
    }), auth_1.authRouter);
    app.use("/api/uploads", uploads_1.uploadsRouter);
    app.use("/api/stats", stats_1.statsRouter);
    app.use("/api/admin", admin_1.adminRouter);
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.use("/uploads", express_1.default.static(path_1.default.resolve(env.UPLOAD_DIR)));
    app.use(errorHandler_1.notFound);
    app.use(errorHandler_1.errorHandler);
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
