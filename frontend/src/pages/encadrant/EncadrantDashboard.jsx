import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { stageEncadrantAPI } from "api/stage";
import { Spinner } from "components/ui";

function StatCard({ num, label, color }) {
  const colors = { blue: "#3B5BDB", green: "#22C55E", yellow: "#F59E0B", red: "#EF4444" };
  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4,
                    color: colors[color] || "var(--text1)" }}>
        {num ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ value, danger }) {
  const color = danger ? "#EF4444" : value >= 75 ? "#22C55E" : value >= 40 ? "#3B5BDB" : "#F59E0B";
  return (
    <div style={{ background: "var(--g1)", borderRadius: 6, height: 8, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${value}%`, height: "100%", background: color,
                    borderRadius: 6, transition: "width .4s ease" }} />
    </div>
  );
}

export default function EncadrantDashboard() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stageEncadrantAPI.dashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const { nb_stagiaires, nb_sujets, nb_retards, stagiaires } = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bonjour, {user?.nom?.split(" ")[0]}</h1>
          <p className="page-subtitle">
            Espace Encadrant — {user?.specialite || user?.departement || "3LM Solutions"}
          </p>
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <StatCard num={nb_stagiaires} label="Stagiaires assignés"   color="blue"   />
        <StatCard num={nb_sujets}     label="Sujets de stage"       color="green"  />
        <StatCard num={nb_retards}    label="Stagiaires en retard"  color={nb_retards > 0 ? "red" : "green"} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="section-title" style={{ marginBottom: 0, borderBottom: "none" }}>
          Mes stagiaires
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/encadrant/stagiaires")}>
            Tous les stagiaires →
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/encadrant/sujets")}>
            Mes sujets →
          </button>
        </div>
      </div>

      {!stagiaires?.length ? (
        <div className="card" style={{ padding: 28, textAlign: "center", borderStyle: "dashed" }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Aucun stagiaire assigné</p>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>
            Un administrateur doit vous assigner comme encadrant sur un sujet de stage.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--g2)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600,
                             color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Stagiaire
                </th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600,
                             color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Sujet
                </th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600,
                             color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".4px", width: 200 }}>
                  Avancement
                </th>
                <th style={{ padding: "10px 16px", width: 100 }} />
              </tr>
            </thead>
            <tbody>
              {stagiaires.map(s => (
                <tr key={s.candidature_id}
                  style={{ borderBottom: "1px solid var(--g1)", cursor: "pointer" }}
                  onClick={() => navigate(`/encadrant/stagiaire/${s.candidature_id}`)}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontWeight: 500, fontSize: 14 }}>{s.stagiaire_nom}</p>
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>{s.stagiaire_email}</p>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text2)" }}>
                    {s.sujet_titre || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ProgressBar value={s.avancement} danger={s.en_retard} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.en_retard ? "#EF4444" : "var(--text1)",
                                     minWidth: 34, textAlign: "right" }}>
                        {s.avancement}%
                      </span>
                    </div>
                    {s.en_retard && (
                      <span style={{ fontSize: 11, color: "#EF4444" }}>Sprint en retard</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "var(--blue)" }}>Détail →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
