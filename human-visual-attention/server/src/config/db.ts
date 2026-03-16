import mongoose from "mongoose";
import type { Env } from "./env";

export async function connectDb(env: Env) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
}

