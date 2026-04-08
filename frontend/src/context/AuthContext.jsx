import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem("gh_token"));
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("gh_token"));

  // Fetch user info whenever token changes
  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data))
      .catch(() => { logout(); })        // token invalid/expired
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((newToken) => {
    localStorage.setItem("gh_token", newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gh_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
