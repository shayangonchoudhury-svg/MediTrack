import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = guest, obj = signed in
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);

  const refreshProfiles = useCallback(async () => {
    try {
      const { data } = await api.get("/profiles");
      setProfiles(data);
      if (data.length > 0) {
        setActiveProfileId((curr) => {
          if (curr && data.some((p) => p.id === curr)) return curr;
          const stored = localStorage.getItem("meditrack:activeProfile");
          if (stored && data.some((p) => p.id === stored)) return stored;
          return data[0].id;
        });
      } else {
        setActiveProfileId(null);
      }
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    if (activeProfileId) localStorage.setItem("meditrack:activeProfile", activeProfileId);
  }, [activeProfileId]);

  const checkSession = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      await refreshProfiles();
    } catch {
      setUser(false);
    }
  }, [refreshProfiles]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      await refreshProfiles();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      setUser(data);
      await refreshProfiles();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e) };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    setUser(false);
    setProfiles([]);
    setActiveProfileId(null);
    localStorage.removeItem("meditrack:activeProfile");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profiles,
        activeProfileId,
        setActiveProfileId,
        refreshProfiles,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
