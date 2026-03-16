import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import type { UserRole } from "../models/User";
import { loadEnv } from "../config/env";

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      auth?: AuthUser;
    }
  }
}

type JwtPayload = { sub: string; role: UserRole };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization") || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token" } });

    const env = loadEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.sub).select("_id role");
    if (!user) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });

    req.auth = { id: user._id.toString(), role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing token" } });
  if (req.auth.role !== "admin") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin only" } });
  next();
}

