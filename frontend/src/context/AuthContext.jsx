import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem("gh_token"));
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem("gh_token"));
  // PAT lives in sessionStorage — cleared when browser tab closes
  const [pat, setPat] = useState(() => sessionStorage.getItem("gh_pat") || "");

  // Fetch user info whenever OAuth token changes
  useEffect(() => {
    if (!token) { setUser(null); setLoading(false); return; }
    setLoading(true);
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUser(data))
      .catch(() => { logout(); })
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

  const savePat = useCallback((value) => {
    if (value) sessionStorage.setItem("gh_pat", value);
    else sessionStorage.removeItem("gh_pat");
    setPat(value);
  }, []);

  // Effective token: OAuth token > PAT > nothing
  const activeToken = token || pat || null;

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, pat, savePat, activeToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
