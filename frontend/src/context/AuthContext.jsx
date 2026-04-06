import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

const AuthContext = createContext(null);
const STORAGE_KEY = "sfz-auth-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let active = true;

    apiRequest("/auth/me", { token })
      .then((payload) => {
        if (active) {
          setUser(payload.user);
        }
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(STORAGE_KEY);
          setToken("");
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function login(credentials) {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials
    });

    localStorage.setItem(STORAGE_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
  }

  async function logout() {
    try {
      if (token) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token
        });
      }
    } catch {
      // ignore network errors during logout cleanup
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setToken("");
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      setUser,
      isAuthenticated: Boolean(token && user),
      hasPermission: (permission) => user?.permissions?.includes(permission)
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
