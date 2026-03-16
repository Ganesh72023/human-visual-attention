"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const env_1 = require("../config/env");
async function requireAuth(req, res, next) {
    try {
        const header = req.header("authorization") || "";
        const [, token] = header.split(" ");
        if (!token)
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
        const env = (0, env_1.loadEnv)();
        const decoded = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.sub).select("_id role");
        if (!user)
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
        req.auth = { id: user._id.toString(), role: user.role };
        next();
    }
    catch {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
    }
}
function requireAdmin(req, res, next) {
    if (!req.auth)
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
    if (req.auth.role !== "admin")
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin only" } });
    next();
}
