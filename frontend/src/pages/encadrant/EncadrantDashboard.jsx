import { useAuth } from "context/AuthContext";

export default function EncadrantDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bonjour, {user?.nom?.split(" ")[0]}</h1>
          <p className="page-subtitle">Espace Encadrant — {user?.specialite || user?.departement || "3LM Solutions"}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--blue)" }}>—</div>
          <div className="stat-label">Stagiaires assignés</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--warning)" }}>—</div>
          <div className="stat-label">Sujets de stage</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: "var(--success)" }}>—</div>
          <div className="stat-label">Évaluations en cours</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 32, textAlign: "center", borderStyle: "dashed" }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>🚧</p>
        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Module stagiaires en cours de développement</p>
        <p style={{ color: "var(--text2)", fontSize: 14 }}>
          Les fonctionnalités de suivi de stagiaires (F15), gestion des sujets de stage (F11)
          et tableau de charge (F16) seront disponibles prochainement.
        </p>
      </div>
    </div>
  );
}
