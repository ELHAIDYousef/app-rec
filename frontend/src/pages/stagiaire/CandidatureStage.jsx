import { useState, useEffect } from "react";
import { stageCandidatureAPI } from "api/stage";
import { Spinner } from "components/ui";
import toast from "react-hot-toast";

const STATUT_INFO = {
  en_attente: { label: "En attente",  color: "#F59E0B" },
  acceptee:   { label: "Acceptée",    color: "#22C55E" },
  refusee:    { label: "Refusée",     color: "#EF4444" },
};

export default function CandidatureStage() {
  const [candidature, setCandidature] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [mode,        setMode]        = useState("view"); // "view" | "create" | "edit"

  const [motivation, setMotivation] = useState("");
  const [cv,         setCv]         = useState(null);
  const [convention, setConvention] = useState(null);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const r = await stageCandidatureAPI.mes({ page_size: 1 });
      const item = r.data.items[0] || null;
      setCandidature(item);
      if (item) setMotivation(item.motivation || "");
    } catch {}
    finally { setLoading(false); }
  };

  const ouvrirEdition = () => {
    setMotivation(candidature.motivation || "");
    setCv(null);
    setConvention(null);
    setMode("edit");
  };

  const soumettre = async e => {
    e.preventDefault();
    if (!motivation.trim()) { toast.error("La lettre de motivation est requise"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("motivation", motivation);
      if (cv)         fd.append("cv", cv);
      if (convention) fd.append("convention", convention);

      if (mode === "edit") {
        await stageCandidatureAPI.modifier(candidature.id, fd);
        toast.success("Candidature modifiée avec succès !");
      } else {
        await stageCandidatureAPI.soumettre(fd);
        toast.success("Candidature soumise avec succès !");
      }
      setMode("view");
      charger();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la soumission");
    } finally { setSubmitting(false); }
  };

  const annuler = () => {
    setMode("view");
    setCv(null);
    setConvention(null);
    if (candidature) setMotivation(candidature.motivation || "");
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  const peutEditer = candidature && candidature.statut !== "acceptee";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidature de Stage</h1>
          <p className="page-subtitle">Soumettez votre demande de stage et suivez son avancement</p>
        </div>
        {!candidature && mode === "view" && (
          <button className="btn btn-primary" onClick={() => setMode("create")}>
            + Soumettre une candidature
          </button>
        )}
        {candidature && mode === "view" && peutEditer && (
          <button className="btn btn-outline" onClick={ouvrirEdition}>
            Modifier ma candidature
          </button>
        )}
      </div>

      {/* Formulaire création / édition */}
      {(mode === "create" || mode === "edit") && (
        <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
            {mode === "edit" ? "Modifier ma candidature" : "Nouvelle candidature de stage"}
          </h3>
          <form onSubmit={soumettre}>
            <div className="field">
              <label className="field-label">Lettre de motivation *</label>
              <textarea className="field-input" rows={7}
                placeholder="Décrivez votre motivation, vos objectifs de stage, vos compétences..."
                value={motivation} onChange={e => setMotivation(e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">
                CV (PDF recommandé)
                {mode === "edit" && candidature?.cv_fichier && (
                  <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 6 }}>
                    — laisser vide pour garder l'actuel
                  </span>
                )}
              </label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setCv(e.target.files[0])} />
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>PDF, Word — max 5 MB</p>
            </div>

            <div className="field">
              <label className="field-label">
                Convention de stage (optionnel)
                {mode === "edit" && candidature?.convention_fichier && (
                  <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 6 }}>
                    — laisser vide pour garder l'actuelle
                  </span>
                )}
              </label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setConvention(e.target.files[0])} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Envoi..."
                  : mode === "edit" ? "Enregistrer les modifications"
                  : "Soumettre ma candidature"}
              </button>
              <button type="button" className="btn btn-outline" onClick={annuler}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Affichage de la candidature existante */}
      {candidature && mode === "view" ? (
        <div className="card" style={{ maxWidth: 680 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 16 }}>Votre candidature</h3>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                Soumise le {new Date(candidature.cree_le).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <span style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: (STATUT_INFO[candidature.statut]?.color || "#94A3B8") + "20",
              color: STATUT_INFO[candidature.statut]?.color || "#94A3B8",
            }}>
              {STATUT_INFO[candidature.statut]?.label || candidature.statut}
            </span>
          </div>

          {candidature.statut === "acceptee" && (
            <div style={{ background: "#FEF9C3", border: "1px solid #FDE68A", borderRadius: 8,
                          padding: "8px 14px", marginBottom: 14, fontSize: 12, color: "#92400E" }}>
              Votre candidature est acceptée — la modification n'est plus possible.
            </div>
          )}

          <div style={{ background: "var(--bg)", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {candidature.motivation}
            </p>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>CV :</span>
              {candidature.cv_fichier
                ? <button className="btn btn-outline btn-sm"
                    onClick={() => stageCandidatureAPI.telechargerCV(candidature.id)}>
                    Télécharger
                  </button>
                : <span style={{ fontSize: 12, color: "var(--text3)" }}>Non fourni</span>
              }
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>Convention :</span>
              <span style={{ fontSize: 12, color: candidature.convention_fichier ? "var(--success)" : "var(--text3)" }}>
                {candidature.convention_fichier ? "Fournie" : "Non fournie"}
              </span>
            </div>
          </div>

          {candidature.sujet_titre && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8,
                          padding: "10px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#1D4ED8" }}>
                Sujet affecté : {candidature.sujet_titre}
              </p>
            </div>
          )}

          {candidature.message_ia && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
                          padding: "12px 16px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginBottom: 6 }}>Message de l'équipe</p>
              <p style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{candidature.message_ia}</p>
            </div>
          )}
        </div>
      ) : !candidature && mode === "view" ? (
        <div className="empty-state">
          <p className="empty-state-title">Aucune candidature</p>
          <p className="empty-state-desc">Soumettez votre première candidature de stage</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setMode("create")}>
            Soumettre une candidature
          </button>
        </div>
      ) : null}
    </div>
  );
}
