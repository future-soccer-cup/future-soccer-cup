import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown, false = unauthenticated, object = user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (mounted) setUser(res.data);
      })
      .catch(() => {
        if (mounted) setUser(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data);
    return res.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    // Si la llamada al backend falla (sesión ya vencida, error de red, etc.) igual
    // cerramos la sesión del lado del cliente — antes, un error acá dejaba el botón
    // de "Cerrar sesión" sin hacer nada (ni limpiaba el usuario ni redirigía).
    try {
      await api.post("/auth/logout");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.warn("[auth] logout request failed, clearing session locally anyway:", err?.message);
    } finally {
      setUser(false);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders in consumers.
  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
