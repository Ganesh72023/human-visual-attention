import "dotenv/config";
import bcrypt from "bcryptjs";
import { loadEnv } from "../config/env";
import { connectDb } from "../config/db";
import { User } from "../models/User";

async function seed() {
  const env = loadEnv();
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in environment");
  }

  await connectDb(env);

  const email = env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name: env.ADMIN_NAME, email, passwordHash, role: "admin" } },
    { upsert: true, new: true }
  );

  // eslint-disable-next-line no-console
  console.log(`Seeded admin: ${user.email} (${user._id})`);
  process.exit(0);
}

seed().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

