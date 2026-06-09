import { useState, useEffect } from "react";
import FormationLogin   from "./FormationLogin";
import FormationAdmin   from "./FormationAdmin";
import EmployeDashboard from "./EmployeDashboard";
import PasserTest       from "./PasserTest";

export default function FormationApp({ onBack }) {
  const [employe,   setEmploye]   = useState(null);
  const [formation, setFormation] = useState(null);
  const [resultat,  setResultat]  = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("form_user");
    if (u) try { setEmploye(JSON.parse(u)); } catch {}

    const handleLogout = () => {
      setEmploye(null); setFormation(null); setResultat(null);
    };
    window.addEventListener("form_logout", handleLogout);
    return () => window.removeEventListener("form_logout", handleLogout);
  }, []);

  const login  = (emp) => { setEmploye(emp); setFormation(null); setResultat(null); };
  const logout = () => {
    localStorage.removeItem("form_token");
    localStorage.removeItem("form_user");
    setEmploye(null); setFormation(null); setResultat(null);
  };

  if (!employe)
    return <FormationLogin onLogin={login} onBack={onBack}/>;

  if (formation && !resultat)
    return <PasserTest
      formation={formation} employe={employe}
      onTermine={(r) => setResultat(r)}
      onRetour={() => { setFormation(null); setResultat(null); }}
    />;

  if (formation && resultat)
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex",
                    flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:"var(--white)", borderRadius:12, padding:40, maxWidth:520,
                      width:"90%", border:"1px solid #e5e7eb", textAlign:"center" }}>
          <p style={{ fontSize:48, fontWeight:700, marginBottom:8,
            color: resultat.note >= 70 ? "var(--success)" : resultat.note >= 50 ? "var(--warning)" : "var(--danger)" }}>
            {resultat.note}/100
          </p>
          <p style={{ color:"var(--text2)", marginBottom:24 }}>{formation.titre}</p>
          <p style={{ marginBottom:24, fontSize:14 }}>
            {resultat.note >= 70
              ? "Excellent ! Formation validée."
              : resultat.note >= 50
              ? "Résultat acceptable. Vous pouvez repasser."
              : "Résultat insuffisant. Révisez et repassez."}
          </p>
          <button onClick={() => { setFormation(null); setResultat(null); }}
            style={{ padding:"10px 24px", borderRadius:8, background:"var(--blue)",
                     color:"var(--white)", border:"none", cursor:"pointer", fontWeight:600 }}>
            Retour aux tests
          </button>
        </div>
      </div>
    );

  if (employe.role === 'formateur')
    return <FormationAdmin employe={employe} onLogout={logout}/>;

  return <EmployeDashboard
    employe={employe} onLogout={logout}
    onPasser={(f) => { setFormation(f); setResultat(null); }}
  />;
}
