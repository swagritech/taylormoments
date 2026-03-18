"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getMe,
  loginAccount,
  registerAccount,
  type AuthResponse,
  type AuthUser,
} from "@/lib/live-api";

const TOKEN_KEY = "tm_auth_token";
const USER_KEY = "tm_auth_user";

type AuthContextType = {
  user: AuthUser | null;
  token: string;
  loading: boolean;
  login: (params: { email: string; password: string }) => Promise<AuthUser>;
  register: (params: {
    email: string;
    password: string;
    role: "customer" | "winery" | "transport" | "ops";
    display_name: string;
    first_name?: string;
    last_name?: string;
    partner_role_title?: string;
    phone?: string;
    home_country?: string;
    age_group?: string;
    gender?: string;
    winery_id?: string;
    winery_address?: string;
    winery_website?: string;
    terms_accepted?: boolean;
    transport_company?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistAuth(response: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const storedUser = localStorage.getItem(USER_KEY);

    async function hydrate() {
      const storedToken = localStorage.getItem(TOKEN_KEY) ?? "";
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const me = await getMe(storedToken);
        if (!active) {
          return;
        }
        setToken(storedToken);
        setUser(me.user);
        localStorage.setItem(USER_KEY, JSON.stringify(me.user));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (!active) {
          return;
        }
        setToken("");
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  async function login(params: { email: string; password: string }) {
    const response = await loginAccount(params);
    persistAuth(response);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }

  async function register(params: {
    email: string;
    password: string;
    role: "customer" | "winery" | "transport" | "ops";
    display_name: string;
    first_name?: string;
    last_name?: string;
    partner_role_title?: string;
    phone?: string;
    home_country?: string;
    age_group?: string;
    gender?: string;
    winery_id?: string;
    winery_address?: string;
    winery_website?: string;
    terms_accepted?: boolean;
    transport_company?: string;
  }) {
    const response = await registerAccount(params);
    persistAuth(response);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken("");
  }

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
