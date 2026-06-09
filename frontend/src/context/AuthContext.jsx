import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem("tf_token");
    const stored = localStorage.getItem("tf_user");
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem("tf_user"); }
      authAPI.me()
        .then(res => { setUser(res.data); localStorage.setItem("tf_user", JSON.stringify(res.data)); })
        .catch(() => { localStorage.removeItem("tf_token"); localStorage.removeItem("tf_user"); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, motDePasse) => {
    const res = await authAPI.connexion({ email, mot_de_passe: motDePasse });
    const { access_token, user: u } = res.data;
    localStorage.setItem("tf_token", access_token);
    localStorage.setItem("tf_user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tf_token");
    localStorage.removeItem("tf_user");
    setUser(null);
  }, []);

  const updateUser = useCallback(u => {
    setUser(u);
    localStorage.setItem("tf_user", JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
