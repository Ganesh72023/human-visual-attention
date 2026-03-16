import { motion } from "framer-motion";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PillLink(props: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          "rounded-full px-3 py-1.5 text-sm font-medium transition",
          isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
        ].join(" ")
      }
    >
      {props.children}
    </NavLink>
  );
}

export function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -7, scale: 0.9, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300/90 to-amber-300/80 text-black shadow-glow"
          >
            <span className="font-[700]">HV</span>
          </motion.div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold tracking-tight text-white">Human Visual Attention</div>
            <div className="text-xs text-white/55">Analyzer</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <PillLink to="/">Home</PillLink>
          {auth.user ? <PillLink to="/dashboard">Dashboard</PillLink> : null}
          {auth.user?.role === "admin" ? <PillLink to="/admin">Admin</PillLink> : null}
        </nav>

        <div className="flex items-center gap-2">
          {!auth.user ? (
            <>
              <Link
                to="/login"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <div className="hidden text-right md:block">
                <div className="text-sm font-semibold text-white">{auth.user.name}</div>
                <div className="text-xs text-white/55">{auth.user.email}</div>
              </div>
              <button
                onClick={() => {
                  auth.logout();
                  navigate("/");
                }}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

