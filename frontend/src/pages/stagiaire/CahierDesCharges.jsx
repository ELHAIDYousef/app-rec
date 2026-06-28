import { useState, useEffect } from "react";
import { stageCahierAPI } from "api/stage";
import { Spinner } from "components/ui";
import toast from "react-hot-toast";

function Section({ title, content }) {
  if (!content) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)", marginBottom: 10,
        paddingBottom: 6, borderBottom: "2px solid var(--blue)" }}>{title}</h3>
      {Array.isArray(content) ? (
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {content.map((item, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{item}</li>)}
        </ul>
      ) : typeof content === "object" ? (
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(content).map(([k, v]) => (
            <div key={k}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "capitalize" }}>{k}</p>
              {Array.isArray(v)
                ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {v.map(t => <span key={t} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 12,
                      background: "#EFF6FF", color: "#1D4ED8" }}>{t}</span>)}
                  </div>
                : <p style={{ fontSize: 13, color: "var(--text2)" }}>{v}</p>
              }
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{content}</p>
      )}
    </div>
  );
}

function Planning({ planning }) {
  if (!planning?.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)", marginBottom: 10,
        paddingBottom: 6, borderBottom: "2px solid var(--blue)" }}>Planning</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {planning.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center",
            background: "var(--bg)", padding: "10px 14px", borderRadius: 8 }}>
            <span style={{ minWidth: 80, fontSize: 12, fontWeight: 600, color: "var(--blue)",
              background: "#EFF6FF", padding: "3px 8px", borderRadius: 6, textAlign: "center" }}>
              Sem. {p.semaine}
            </span>
            <p style={{ fontSize: 13, color: "var(--text2)" }}>{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CahierDesCharges() {
  const [cahier,    setCahier]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(null); // "pdf" | "word" | null

  useEffect(() => {
    stageCahierAPI.monCahier()
      .then(r => setCahier(r.data))
      .catch(() => setCahier(null))
      .finally(() => setLoading(false));
  }, []);

  const exporter = async (format) => {
    if (exporting) return;
    setExporting(format);
    try {
      if (format === "pdf")  await stageCahierAPI.exportMonPdf();
      if (format === "word") await stageCahierAPI.exportMonWord();
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  if (!cahier) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cahier des Charges</h1>
      </div>
      <div className="empty-state">
        <p className="empty-state-title">Cahier des charges non disponible</p>
        <p className="empty-state-desc">
          Le cahier des charges sera généré automatiquement par l'IA après validation de votre sujet de stage
        </p>
      </div>
    </div>
  );

  const c = cahier.contenu || {};

  return (
    <div>
      <div className="page-header" style={{ displayPrint: "none" }}>
        <div>
          <h1 className="page-title">Cahier des Charges</h1>
          <p className="page-subtitle">
            {cahier.sujet_titre} —
            <span style={{
              marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 11,
              background: cahier.statut === "valide" ? "#D1FAE5" : "#FEF3C7",
              color: cahier.statut === "valide" ? "#065F46" : "#92400E",
            }}>
              {cahier.statut === "valide" ? "Validé" : "Généré"}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => exporter("pdf")}
            disabled={!!exporting}
            style={{ minWidth: 130 }}
          >
            {exporting === "pdf" ? "Export en cours..." : "Exporter PDF"}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => exporter("word")}
            disabled={!!exporting}
            style={{ minWidth: 140 }}
          >
            {exporting === "word" ? "Export en cours..." : "Exporter Word (.docx)"}
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <div style={{ textAlign: "center", marginBottom: 24, paddingBottom: 20,
          borderBottom: "2px solid var(--gray2)" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Cahier des Charges</h2>
          <h3 style={{ fontSize: 16, color: "var(--blue)", marginTop: 4 }}>{cahier.sujet_titre}</h3>
          {c.duree_stage && <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>Durée : {c.duree_stage}</p>}
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            Généré le {new Date(cahier.cree_le).toLocaleDateString("fr-FR")}
          </p>
        </div>

        <Section title="1. Présentation du Projet" content={c.presentation} />
        <Section title="2. Contexte" content={c.contexte} />
        <Section title="3. Objectifs" content={c.objectifs} />
        <Section title="4. Périmètre Fonctionnel" content={c.perimetre_fonctionnel} />
        <Section title="5. Technologies Recommandées" content={c.technologies_recommandees} />
        <Section title="6. Livrables" content={c.livrables} />
        <Planning planning={c.planning} />
        <Section title="8. Critères d'Évaluation" content={c.criteres_evaluation} />
        <Section title="9. Méthodologie" content={c.methodologie} />
      </div>
    </div>
  );
}
