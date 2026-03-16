"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const jwt_1 = require("../services/jwt");
exports.authRouter = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
exports.authRouter.post("/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid input" } });
    const { name, email, password } = parsed.data;
    const existing = await User_1.User.findOne({ email: email.toLowerCase() }).select("_id");
    if (existing)
        return res.status(409).json({ error: { code: "CONFLICT", message: "Email already in use" } });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await User_1.User.create({ name, email: email.toLowerCase(), passwordHash, role: "user" });
    const token = (0, jwt_1.signAccessToken)(user._id.toString(), user.role);
    return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1)
});
async function loginWithRole(req, res, allowedRole) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid input" } });
    const { email, password } = parsed.data;
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    if (!user)
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    if (allowedRole && user.role !== allowedRole) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin credentials required" } });
    }
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    const token = (0, jwt_1.signAccessToken)(user._id.toString(), user.role);
    return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
}
exports.authRouter.post("/login", (req, res) => loginWithRole(req, res));
exports.authRouter.post("/admin/login", (req, res) => loginWithRole(req, res, "admin"));
exports.authRouter.get("/me", auth_1.requireAuth, async (req, res) => {
    const user = await User_1.User.findById(req.auth.id).select("_id name email role");
    if (!user)
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
    return res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
});
