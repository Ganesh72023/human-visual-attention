"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const User_1 = require("../models/User");
async function seed() {
    const env = (0, env_1.loadEnv)();
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in environment");
    }
    await (0, db_1.connectDb)(env);
    const email = env.ADMIN_EMAIL.toLowerCase();
    const passwordHash = await bcryptjs_1.default.hash(env.ADMIN_PASSWORD, 10);
    const user = await User_1.User.findOneAndUpdate({ email }, { $set: { name: env.ADMIN_NAME, email, passwordHash, role: "admin" } }, { upsert: true, new: true });
    // eslint-disable-next-line no-console
    console.log(`Seeded admin: ${user.email} (${user._id})`);
    process.exit(0);
}
seed().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
