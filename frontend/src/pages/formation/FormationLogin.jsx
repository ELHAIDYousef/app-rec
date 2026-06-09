import { useState } from "react";
import { authAPI } from "api/formation";

export default function FormationLogin({ onLogin, onBack }) {
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setError("Veuillez saisir votre code d'accès.");
    setLoading(true); setError("");
    try {
      const data = await authAPI.login(code.trim());
      localStorage.setItem("form_token", data.access_token);
      localStorage.setItem("form_user",  JSON.stringify(data.employe));
      onLogin(data.employe);
    } catch (err) {
      setError("Code invalide. Veuillez vérifier votre code d'accès.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {onBack && (
          <button onClick={onBack} style={{ color: "var(--text3)", fontSize: 13,
            marginBottom: 20, display: "block" }}>
            ← Retour à l'accueil
          </button>
        )}
        <h2 className="auth-title">Agent Formateur</h2>
        <p className="auth-subtitle">Saisissez votre code d'accès</p>
        <form onSubmit={submit}>
          <div className="field">
            <label className="field-label">Code employé</label>
            <input
              className="field-input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="EMP-A3F7"
              style={{ letterSpacing: 3, textAlign: "center", fontSize: 16 }}
            />
          </div>
          {error && <p className="field-error" style={{ marginBottom: 10 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
