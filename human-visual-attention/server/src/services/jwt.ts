import { sign } from "jsonwebtoken";
import type { UserRole } from "../models/User";
import { loadEnv } from "../config/env";

export function signAccessToken(userId: string, role: UserRole) {
  const env = loadEnv();
  return sign({ role }, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN as any });
}
