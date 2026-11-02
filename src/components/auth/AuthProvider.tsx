"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipLevel: string;
  totalSpent: number;
};

type AuthContextValue = {
  user: CurrentUser | null | undefined;
  setUser: (user: CurrentUser | null) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** 放在根 layout，路由切换时不重复请求 /api/auth/me。 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const body = (await response.json()) as { data: CurrentUser };
      setUser(body.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setUser(null);
          return;
        }
        const body = (await response.json()) as { data: CurrentUser };
        if (active) setUser(body.data);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ user, setUser, refresh }), [user, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return context;
}
