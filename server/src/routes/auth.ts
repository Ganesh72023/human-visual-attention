import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { signAccessToken } from "../services/jwt";

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid input" } });

  const { name, email, password } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() }).select("_id");
  if (existing) return res.status(409).json({ error: { code: "CONFLICT", message: "Email already in use" } });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: "user" });
  const token = signAccessToken(user._id.toString(), user.role);

  return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function loginWithRole(req: any, res: any, allowedRole?: "admin") {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid input" } });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });

  if (allowedRole && user.role !== allowedRole) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin credentials required" } });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });

  const token = signAccessToken(user._id.toString(), user.role);
  return res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
}

authRouter.post("/login", (req, res) => loginWithRole(req, res));
authRouter.post("/admin/login", (req, res) => loginWithRole(req, res, "admin"));

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.auth!.id).select("_id name email role");
  if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
  return res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
});

