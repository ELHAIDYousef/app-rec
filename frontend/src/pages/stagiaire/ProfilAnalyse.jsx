import { useState, useEffect } from "react";
import { stageProfilAPI } from "api/stage";
import { Spinner } from "components/ui";
import toast from "react-hot-toast";

const NIVEAU_COLORS = { débutant: "#F59E0B", intermédiaire: "#3B82F6", avancé: "#22C55E" };
const DOMAINE_ICONS = {
  "Développement Web": "🌐", "IA": "🤖", "Data Science": "📊",
  "Mobile": "📱", "Cybersécurité": "🔒", "DevOps": "⚙️",
};

export default function ProfilAnalyse() {
  const [analyse,   setAnalyse]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [cvText,     setCvText]     = useState("");
  const [motivation, setMotivation] = useState("");

  useEffect(() => {
    stageProfilAPI.monAnalyse()
      .then(r => setAnalyse(r.data))
      .catch(() => setAnalyse(null))
      .finally(() => setLoading(false));
  }, []);

  const analyser = async e => {
    e.preventDefault();
    if (!cvText.trim() && !motivation.trim()) {
      toast.error("Entrez votre CV ou votre lettre de motivation");
      return;
    }
    setAnalyzing(true);
    try {
      const r = await stageProfilAPI.analyser({ cv_text: cvText, motivation });
      setAnalyse(r.data);
      setShowForm(false);
      toast.success("Profil analysé avec succès !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'analyse");
    } finally { setAnalyzing(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analyse de Profil IA</h1>
          <p className="page-subtitle">L'IA analyse votre profil et identifie vos compétences</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {analyse ? "Mettre à jour" : "Analyser mon profil"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Analyse IA de votre profil</h3>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
            Collez le texte de votre CV et/ou votre lettre de motivation pour une analyse complète
          </p>
          <form onSubmit={analyser}>
            <div className="field">
              <label className="field-label">Contenu de votre CV</label>
              <textarea className="field-input" rows={6} placeholder="Copiez-collez le texte de votre CV ici..."
                value={cvText} onChange={e => setCvText(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Lettre de motivation / Centres d'intérêt</label>
              <textarea className="field-input" rows={4}
                placeholder="Décrivez vos motivations, vos projets réalisés, vos passions..."
                value={motivation} onChange={e => setMotivation(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={analyzing}>
                {analyzing ? "Analyse en cours..." : "Lancer l'analyse IA"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {analyse ? (
        <div style={{ display: "grid", gap: 16 }}>
          {/* Résumé */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", marginBottom: 6 }}>RÉSUMÉ IA</p>
                <p style={{ fontSize: 14, color: "var(--text1)", lineHeight: 1.7 }}>{analyse.resume_ia}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 80 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 22, fontWeight: 700,
                  background: `conic-gradient(#3B82F6 ${analyse.score}%, var(--gray2) 0)`,
                }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--white)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 700, color: "#3B82F6" }}>
                    {analyse.score}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--text3)" }}>Score</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>NIVEAU TECHNIQUE</p>
              <span style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600,
                background: (NIVEAU_COLORS[analyse.niveau_technique] || "#6B7280") + "20",
                color: NIVEAU_COLORS[analyse.niveau_technique] || "#6B7280",
              }}>{analyse.niveau_technique || "—"}</span>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8 }}>DOMAINE RECOMMANDÉ</p>
              <span style={{ fontSize: 20 }}>{DOMAINE_ICONS[analyse.domaine_recommande] || "🎯"}</span>
              <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{analyse.domaine_recommande || "—"}</p>
            </div>
          </div>

          {/* Compétences */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "COMPÉTENCES", items: analyse.competences, color: "#3B82F6" },
              { label: "TECHNOLOGIES MAÎTRISÉES", items: analyse.technologies_maitrisees, color: "#8B5CF6" },
              { label: "CENTRES D'INTÉRÊT", items: analyse.centres_interet, color: "#F59E0B" },
            ].map(({ label, items, color }) => items?.length > 0 && (
              <div key={label} className="card">
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 10 }}>{label}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map(item => (
                    <span key={item} style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12,
                      background: color + "18", color: color, border: `1px solid ${color}40`,
                    }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "right" }}>
            Analysé le {new Date(analyse.cree_le).toLocaleDateString("fr-FR")}
          </p>
        </div>
      ) : !showForm && (
        <div className="empty-state">
          <p className="empty-state-title">Aucune analyse disponible</p>
          <p className="empty-state-desc">Lancez l'analyse IA pour découvrir votre profil</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>
            Analyser mon profil
          </button>
        </div>
      )}
    </div>
  );
}
