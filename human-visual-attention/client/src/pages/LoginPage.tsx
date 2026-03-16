import { motion } from "framer-motion";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { SectionHeading } from "../components/SectionHeading";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      auth.login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <SectionHeading title="Welcome back" subtitle="Login to upload and view your attention reports." />
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 shadow-glow"
      >
        <label className="block text-sm font-semibold text-white/85">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-200/60"
          placeholder="you@example.com"
          type="email"
          required
        />
        <label className="mt-4 block text-sm font-semibold text-white/85">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-200/60"
          placeholder="Your password"
          type="password"
          required
        />

        {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm">{error}</div> : null}

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
          <Link to="/signup" className="text-sm font-semibold text-white/70 hover:text-white">
            Create an account
          </Link>
        </div>

        <div className="mt-6 text-xs text-white/55">
          Admin?{" "}
          <Link to="/admin/login" className="font-semibold text-white/75 hover:text-white">
            Login here
          </Link>
          .
        </div>
      </motion.form>
    </div>
  );
}
