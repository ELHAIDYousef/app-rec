import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { authAPI } from "api";
import { getApiError } from "utils/helpers";

export default function AuthPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [tab,     setTab]     = useState("connexion");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm,   setRegForm]   = useState({ nom: "", email: "", password: "" });
  const [errors,    setErrors]    = useState({});

  const validerConnexion = () => {
    const e = {};
    if (!loginForm.email.trim())    e.email    = "L'adresse email est requise";
    if (!loginForm.password.trim()) e.password = "Le mot de passe est requis";
    return e;
  };

  const validerInscription = () => {
    const e = {};
    if (!regForm.nom.trim())      e.nom      = "Le nom est requis";
    if (!regForm.email.trim())    e.email    = "L'adresse email est requise";
    if (!regForm.password.trim()) e.password = "Le mot de passe est requis";
    else if (regForm.password.length < 6) e.password = "Minimum 6 caractères";
    return e;
  };

  const handleConnexion = async e => {
    e.preventDefault();
    const errs = validerConnexion();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setError(""); setLoading(true);
    try { await login(loginForm.email, loginForm.password); navigate("/dashboard"); }
    catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  };

  const handleInscription = async e => {
    e.preventDefault();
    const errs = validerInscription();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setError(""); setLoading(true);
    try {
      await authAPI.inscription({ nom: regForm.nom, email: regForm.email, mot_de_passe: regForm.password });
      await login(regForm.email, regForm.password);
      navigate("/dashboard");
    } catch (err) { setError(getApiError(err)); }
    finally { setLoading(false); }
  };

  const changerTab = t => { setTab(t); setError(""); setErrors({}); };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)", letterSpacing: "-.3px" }}>
            3LM Solutions
          </p>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            Plateforme de gestion des candidatures
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === "connexion" ? " active" : ""}`} onClick={() => changerTab("connexion")}>
            Connexion
          </button>
          <button className={`auth-tab${tab === "inscription" ? " active" : ""}`} onClick={() => changerTab("inscription")}>
            Inscription
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {tab === "connexion" ? (
          <>
            <h2 className="auth-title">Bon retour</h2>
            <p className="auth-subtitle">Connectez-vous pour accéder à votre espace</p>
            <form onSubmit={handleConnexion} noValidate>
              <div className="field">
                <label className="field-label">Adresse email</label>
                <input className={`field-input${errors.email ? " has-error" : ""}`}
                  type="email" placeholder="vous@exemple.com" autoComplete="email"
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
              <div className="field">
                <label className="field-label">Mot de passe</label>
                <input className={`field-input${errors.password ? " has-error" : ""}`}
                  type="password" placeholder="••••••••" autoComplete="current-password"
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-title">Créer un compte</h2>
            <p className="auth-subtitle">Rejoignez 3LM Solutions en tant que candidat</p>
            <form onSubmit={handleInscription} noValidate>
              <div className="field">
                <label className="field-label">Nom complet</label>
                <input className={`field-input${errors.nom ? " has-error" : ""}`}
                  type="text" placeholder="Prénom et nom" autoComplete="name"
                  value={regForm.nom}
                  onChange={e => setRegForm({ ...regForm, nom: e.target.value })} />
                {errors.nom && <p className="field-error">{errors.nom}</p>}
              </div>
              <div className="field">
                <label className="field-label">Adresse email</label>
                <input className={`field-input${errors.email ? " has-error" : ""}`}
                  type="email" placeholder="vous@exemple.com" autoComplete="email"
                  value={regForm.email}
                  onChange={e => setRegForm({ ...regForm, email: e.target.value })} />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
              <div className="field">
                <label className="field-label">Mot de passe</label>
                <input className={`field-input${errors.password ? " has-error" : ""}`}
                  type="password" placeholder="6 caractères minimum" autoComplete="new-password"
                  value={regForm.password}
                  onChange={e => setRegForm({ ...regForm, password: e.target.value })} />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Création..." : "Créer mon compte"}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
