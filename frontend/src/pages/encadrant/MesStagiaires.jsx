import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stageEncadrantAPI } from "api/stage";
import { Spinner } from "components/ui";

function ProgressBar({ value, danger }) {
  const color = danger ? "#EF4444" : value >= 75 ? "#22C55E" : value >= 40 ? "#3B5BDB" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: "var(--g1)", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color,
                      borderRadius: 6, transition: "width .4s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600,
                     color: danger ? "#EF4444" : "var(--text1)", minWidth: 34 }}>
        {value}%
      </span>
    </div>
  );
}

export default function MesStagiaires() {
  const navigate = useNavigate();
  const [stagiaires, setStagiaires] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    stageEncadrantAPI.mesStagiaires()
      .then(r => setStagiaires(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes Stagiaires</h1>
          <p className="page-subtitle">{stagiaires.length} stagiaire(s) sous votre supervision</p>
        </div>
      </div>

      {stagiaires.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", borderStyle: "dashed" }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Aucun stagiaire assigné</p>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>
            Vos stagiaires apparaîtront ici une fois qu'un administrateur vous assigne comme encadrant
            sur un sujet de stage et qu'une candidature est acceptée.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {stagiaires.map(s => (
            <div key={s.candidature_id}
              className="card"
              style={{ padding: "16px 20px", cursor: "pointer", transition: "box-shadow .15s" }}
              onClick={() => navigate(`/encadrant/stagiaire/${s.candidature_id}`)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF",
                                  color: "#1D4ED8", display: "flex", alignItems: "center",
                                  justifyContent: "center", fontWeight: 700, fontSize: 14, flex: "none" }}>
                      {s.stagiaire_nom?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{s.stagiaire_nom}</p>
                      <p style={{ fontSize: 12, color: "var(--text3)" }}>{s.stagiaire_email}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8 }}>
                    Sujet : <strong>{s.sujet_titre || "—"}</strong>
                  </p>
                </div>

                <div style={{ minWidth: 200 }}>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
                    Avancement global
                  </div>
                  <ProgressBar value={s.avancement} danger={s.en_retard} />
                  <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
                    <span>{s.taches_terminees}/{s.total_taches} tâches</span>
                    {s.en_retard && (
                      <span style={{ color: "#EF4444", fontWeight: 600 }}>Sprint en retard</span>
                    )}
                  </div>
                </div>

                <div style={{ alignSelf: "center", color: "var(--blue)", fontSize: 18 }}>›</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
