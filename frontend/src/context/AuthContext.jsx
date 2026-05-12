import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("cg_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    sessionStorage.setItem("cg_token", data.access_token);
    const profile = { id: data.user_id, email, role: data.role ?? "member" };
    sessionStorage.setItem("cg_user", JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (email, password, fullName, role = "member") => {
    const data = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
      role,
    });
    sessionStorage.setItem("cg_token", data.access_token);
    const profile = { id: data.user_id, email, full_name: fullName, role: data.role ?? role };
    sessionStorage.setItem("cg_user", JSON.stringify(profile));
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("cg_token");
    sessionStorage.removeItem("cg_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
