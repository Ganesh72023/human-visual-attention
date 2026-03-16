import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { getToken, setToken } from "../lib/token";

export type Role = "user" | "admin";
export type AuthUser = { id: string; name: string; email: string; role: Role };

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data.user);
    } catch {
      setToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, logout, refreshMe }),
    [user, token, loading]
  );

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

