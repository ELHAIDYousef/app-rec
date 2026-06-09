import { useState, useEffect } from "react";
import { employeAPI } from "api/formation";

const scoreColor = (n) =>
  n >= 70 ? "var(--success)" : n >= 50 ? "var(--warning)" : "var(--danger)";

export default function EmployeDashboard({ employe, onLogout, onPasser }) {
  const [onglet,     setOnglet]     = useState("tests");
  const [formations, setFormations] = useState([]);
  const [resultats,  setResultats]  = useState([]);
  const [detail,     setDetail]     = useState(null);

  useEffect(() => { charger(); }, [onglet]);

  const charger = async () => {
    if (onglet === "tests")     setFormations(await employeAPI.formations());
    if (onglet === "resultats") setResultats(await employeAPI.resultats());
  };

  const voirDetail = async (id) => {
    const d = await employeAPI.resultat(id);
    setDetail(d); setOnglet("detail");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      <div className="topbar">
        <span className="topbar-logo">
          3LM Solutions — <span>Agent Formateur</span>
        </span>
        <div className="topbar-right">
          <span className="topbar-user">{employe.nom}</span>
          <button className="topbar-logout" onClick={onLogout}>Déconnecter</button>
        </div>
      </div>

      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--g2)",
                    padding: "10px 24px", display: "flex", gap: 6 }}>
        {[["tests", "Tests disponibles"], ["resultats", "Mes résultats"]].map(([o, label]) => (
          <button key={o}
            className={`toggle-btn${onglet === o || (onglet === "detail" && o === "resultats") ? " active" : ""}`}
            onClick={() => setOnglet(o)}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>

        {onglet === "tests" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Tests disponibles</h1>
                <p className="page-subtitle">{formations.length} test(s)</p>
              </div>
            </div>
            {formations.length === 0 && (
              <div className="empty-state">
                <p className="empty-state-title">Aucun test disponible</p>
                <p className="empty-state-desc">Les tests seront visibles dès qu'un administrateur en crée.</p>
              </div>
            )}
            {formations.map(f => (
              <div key={f.id} className="card" style={{ display: "flex",
                justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 500, marginBottom: 4 }}>{f.titre}</p>
                  <p style={{ fontSize: 13, color: "var(--text3)" }}>
                    {Math.min(f.nb_questions, 20)} questions · {f.nb_tentatives} tentative(s)
                    {f.meilleure_note != null && (
                      <span style={{ marginLeft: 10, color: "var(--success)", fontWeight: 500 }}>
                        Meilleur score : {f.meilleure_note}/100
                      </span>
                    )}
                  </p>
                </div>
                <button className="btn btn-blue" onClick={() => onPasser(f)}>
                  {f.nb_tentatives > 0 ? "Repasser" : "Commencer"}
                </button>
              </div>
            ))}
          </div>
        )}

        {onglet === "resultats" && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Mes résultats</h1>
            </div>
            {resultats.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">Aucun résultat</p>
                <p className="empty-state-desc">Passez votre premier test pour voir vos résultats ici.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Formation</th>
                      <th>Note</th>
                      <th>Durée</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultats.map(r => (
                      <tr key={r.id}>
                        <td>{r.formation}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: scoreColor(r.note) }}>
                            {r.note}/100
                          </span>
                        </td>
                        <td style={{ color: "var(--text3)" }}>
                          {r.duree_min ? `${r.duree_min} min` : "—"}
                        </td>
                        <td style={{ color: "var(--text3)" }}>
                          {new Date(r.passe_le).toLocaleDateString("fr-FR")}
                        </td>
                        <td>
                          <button className="btn btn-outline btn-sm"
                            onClick={() => voirDetail(r.id)}>
                            Détail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {onglet === "detail" && detail && (
          <div>
            <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}
              onClick={() => setOnglet("resultats")}>
              ← Retour
            </button>
            <div className="card" style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 44, fontWeight: 700, color: scoreColor(detail.note) }}>
                {detail.note}/100
              </p>
            </div>
            {detail.corrections && detail.corrections.map((c, i) => (
              <div key={i} className="card" style={{ marginBottom: 10,
                borderColor: c.correct ? "var(--green-bd)" : "var(--red-bd)" }}>
                <p style={{ fontWeight: 500, marginBottom: 8 }}>{i + 1}. {c.question}</p>
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  <b>Votre réponse :</b> {c.reponse_employe || "(sans réponse)"}
                </p>
                <p style={{ fontSize: 13, marginBottom: 4, color: "var(--success)" }}>
                  <b>Bonne réponse :</b> {c.bonne_reponse}
                </p>
                {c.feedback && (
                  <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8,
                               background: "var(--g1)", padding: "6px 10px",
                               borderRadius: "var(--r)" }}>
                    {c.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
