import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stageEncadrantAPI } from "api/stage";
import { Spinner } from "components/ui";

const STATUT_COLORS = {
  disponible: "#22C55E", reserve: "#F59E0B", affecte: "#3B82F6", termine: "#6B7280",
};

export default function MesSujets() {
  const navigate = useNavigate();
  const [sujets,  setSujets]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stageEncadrantAPI.mesSujets()
      .then(r => setSujets(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes Sujets de Stage</h1>
          <p className="page-subtitle">{sujets.length} sujet(s) qui vous sont assignés</p>
        </div>
      </div>

      {sujets.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", borderStyle: "dashed" }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Aucun sujet assigné</p>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>
            Un administrateur doit vous désigner comme encadrant sur un sujet de stage.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sujets.map(s => (
            <div key={s.id} className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 15 }}>{s.titre}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                                   background: `${STATUT_COLORS[s.statut]}20`,
                                   color: STATUT_COLORS[s.statut] }}>
                      {s.statut}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10 }}>
                    {s.description.slice(0, 180)}{s.description.length > 180 ? "…" : ""}
                  </p>
                  {s.technologies?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.technologies.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12,
                                               background: "#EFF6FF", color: "#1D4ED8", fontWeight: 500 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 160, textAlign: "right" }}>
                  {s.stagiaire_nom ? (
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Stagiaire assigné</p>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{s.stagiaire_nom}</p>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => navigate(`/encadrant/stagiaire/${s.candidature_id}`)}>
                        Voir le suivi →
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Stagiaire assigné</p>
                      <p style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>
                        Aucun stagiaire
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
