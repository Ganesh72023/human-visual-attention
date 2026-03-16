import mongoose, { Schema } from "mongoose";

export type UserRole = "user" | "admin";

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["user", "admin"], default: "user" }
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);

