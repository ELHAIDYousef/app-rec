import { useState, useEffect } from "react";
import { stageAvancementAPI } from "api/stage";
import { Spinner } from "components/ui";
import toast from "react-hot-toast";

const ALERTE_STYLE = {
  retard:   { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626", icon: "⚠️" },
  absence:  { bg: "#FFF7ED", border: "#FED7AA", color: "#D97706", icon: "⏰" },
  blocage:  { bg: "#FFF7ED", border: "#FED7AA", color: "#D97706", icon: "🔒" },
  warning:  { bg: "#FFF7ED", border: "#FED7AA", color: "#D97706", icon: "⚠️" },
  danger:   { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626", icon: "🚨" },
  info:     { bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB", icon: "ℹ️" },
};

function AlerteBox({ type, message, gravite }) {
  const style = ALERTE_STYLE[gravite] || ALERTE_STYLE[type] || ALERTE_STYLE.info;
  return (
    <div style={{ background: style.bg, border: `1px solid ${style.border}`,
      borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span>{style.icon}</span>
      <p style={{ fontSize: 13, color: style.color }}>{message}</p>
    </div>
  );
}

function SprintBar({ sprint }) {
  const statut_style = {
    planifie: "#6B7280", en_cours: "#3B82F6", termine: "#22C55E",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Sprint {sprint.numero}</span>
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4,
            background: statut_style[sprint.statut] + "20", color: statut_style[sprint.statut] }}>
            {sprint.statut}
          </span>
          {sprint.en_retard && (
            <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>⚠ En retard</span>
          )}
        </div>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>{sprint.done}/{sprint.total} — {sprint.pct}%</span>
      </div>
      <div style={{ height: 8, background: "var(--gray2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          width: `${sprint.pct}%`, height: "100%", transition: "width .4s",
          background: sprint.en_retard ? "#EF4444" : sprint.pct === 100 ? "#22C55E" : "#3B82F6",
        }} />
      </div>
      {sprint.date_debut && (
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
          {sprint.date_debut} → {sprint.date_fin}
        </p>
      )}
    </div>
  );
}

export default function Avancement() {
  const [stats,    setStats]    = useState(null);
  const [analyse,  setAnalyse]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadingAI,setLoadingAI]= useState(false);

  useEffect(() => {
    stageAvancementAPI.stats()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const analyserAvecIA = async () => {
    setLoadingAI(true);
    try {
      const r = await stageAvancementAPI.analyseIA();
      setAnalyse(r.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur IA");
    } finally { setLoadingAI(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  if (!stats) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Suivi de l'Avancement</h1>
      </div>
      <div className="empty-state">
        <p className="empty-state-title">Aucun stage actif</p>
        <p className="empty-state-desc">Le suivi sera disponible après l'acceptation de votre candidature</p>
      </div>
    </div>
  );

  const prodColor = stats.avancement_global >= 75 ? "#22C55E" : stats.avancement_global >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suivi de l'Avancement</h1>
          <p className="page-subtitle">Taux global : {stats.avancement_global}%</p>
        </div>
        <button className="btn btn-primary" onClick={analyserAvecIA} disabled={loadingAI}>
          {loadingAI ? "Analyse IA..." : "Analyse IA"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[
          { num: `${stats.avancement_global}%`, label: "Avancement global",    color: prodColor },
          { num: stats.total_taches,             label: "Tâches totales",        color: "#3B82F6" },
          { num: stats.taches_terminees,          label: "Tâches terminées",      color: "#22C55E" },
          { num: stats.nb_daily_reports,          label: "Daily reports soumis",  color: "#8B5CF6" },
        ].map(({ num, label, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-num" style={{ color }}>{num}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {stats.alertes?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Alertes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.alertes.map((a, i) => (
              <AlerteBox key={i} type={a.type} message={a.message} gravite={a.type} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Progression par sprint */}
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 16 }}>Progression par sprint</p>
          {stats.sprints.map(s => <SprintBar key={s.id} sprint={s} />)}
        </div>

        {/* Analyse IA */}
        <div className="card">
          <p style={{ fontWeight: 600, marginBottom: 12 }}>Analyse IA</p>
          {analyse ? (
            <div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 12 }}>
                {analyse.synthese}
              </p>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 6 }}>NIVEAU DE PRODUCTIVITÉ</p>
                <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: {excellent:"#D1FAE5",bon:"#DBEAFE",moyen:"#FEF3C7",faible:"#FEE2E2"}[analyse.niveau_productivite] || "#F3F4F6",
                  color: {excellent:"#065F46",bon:"#1E40AF",moyen:"#92400E",faible:"#7F1D1D"}[analyse.niveau_productivite] || "#374151",
                }}>
                  {analyse.niveau_productivite}
                </span>
              </div>
              {analyse.recommandations?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 6 }}>RECOMMANDATIONS</p>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {analyse.recommandations.map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analyse.pronostic && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6,
                  padding: "8px 12px", marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: "#166534" }}>🎯 {analyse.pronostic}</p>
                </div>
              )}
              {analyse.alertes?.map((a, i) => (
                <AlerteBox key={i} type={a.type} message={a.message} gravite={a.gravite} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🤖</p>
              <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 12 }}>
                Demandez une analyse intelligente de votre avancement
              </p>
              <button className="btn btn-primary btn-sm" onClick={analyserAvecIA} disabled={loadingAI}>
                {loadingAI ? "Analyse..." : "Analyser maintenant"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
