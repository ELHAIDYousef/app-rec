import { useState, useEffect } from "react";
import { stageScrumAPI } from "api/stage";
import { Spinner } from "components/ui";
import toast from "react-hot-toast";

const COLONNES = [
  { key: "a_faire",       label: "À faire",       color: "#6B7280" },
  { key: "en_cours",      label: "En cours",      color: "#3B82F6" },
  { key: "en_validation", label: "En validation", color: "#F59E0B" },
  { key: "termine",       label: "Terminé",       color: "#22C55E" },
];

const PRIORITE_LABELS = { 3: "Haute", 2: "Moyenne", 1: "Basse" };
const PRIORITE_COLORS = { 3: "#EF4444", 2: "#F59E0B", 1: "#6B7280" };

function TacheCard({ tache, onMove, onDelete }) {
  const autres = COLONNES.filter(c => c.key !== tache.statut);
  return (
    <div style={{
      background: "var(--white)", border: "1px solid var(--gray2)", borderRadius: 8,
      padding: "10px 12px", marginBottom: 8,
      borderLeft: `3px solid ${PRIORITE_COLORS[tache.priorite] || "#6B7280"}`,
    }}>
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{tache.titre}</p>
      {tache.description && (
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6, lineHeight: 1.5 }}>
          {tache.description}
        </p>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
          background: PRIORITE_COLORS[tache.priorite] + "20", color: PRIORITE_COLORS[tache.priorite] }}>
          {PRIORITE_LABELS[tache.priorite] || "Basse"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {autres.map(col => (
            <button key={col.key} onClick={() => onMove(tache.id, col.key)}
              title={`Déplacer vers ${col.label}`}
              style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${col.color}`,
                background: col.color + "15", color: col.color, fontSize: 10, cursor: "pointer" }}>
              → {col.label.split(" ")[0]}
            </button>
          ))}
          <button onClick={() => onDelete(tache.id)}
            style={{ padding: "2px 6px", borderRadius: 4, border: "1px solid #EF444440",
              background: "#FEE2E2", color: "#EF4444", fontSize: 10, cursor: "pointer" }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyReportModal({ sprint, onClose }) {
  const [realise,     setRealise]     = useState("");
  const [difficultes, setDifficultes] = useState("");
  const [prevu,       setPrevu]       = useState("");
  const [saving,      setSaving]      = useState(false);

  const soumettre = async e => {
    e.preventDefault();
    if (!realise.trim() || !prevu.trim()) { toast.error("Remplissez les champs obligatoires"); return; }
    setSaving(true);
    try {
      await stageScrumAPI.soumettreReport({ sprint_id: sprint.id, realise, difficultes, prevu });
      toast.success("Daily report soumis !");
      onClose();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0006", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600 }}>Daily Report — {sprint.titre}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={soumettre}>
          <div className="field">
            <label className="field-label">Tâches réalisées * <span style={{ color: "var(--text3)" }}>(aujourd'hui)</span></label>
            <textarea className="field-input" rows={3} value={realise} onChange={e => setRealise(e.target.value)}
              placeholder="Ce que vous avez accompli aujourd'hui..." />
          </div>
          <div className="field">
            <label className="field-label">Difficultés rencontrées</label>
            <textarea className="field-input" rows={2} value={difficultes} onChange={e => setDifficultes(e.target.value)}
              placeholder="Blocages, questions, problèmes..." />
          </div>
          <div className="field">
            <label className="field-label">Tâches prévues *</label>
            <textarea className="field-input" rows={2} value={prevu} onChange={e => setPrevu(e.target.value)}
              placeholder="Ce que vous prévoyez pour demain..." />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Envoi..." : "Soumettre le daily report"}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ScrumBoard() {
  const [sprints,       setSprints]       = useState([]);
  const [sprintActif,   setSprintActif]   = useState(null);
  const [taches,        setTaches]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showReport,    setShowReport]    = useState(false);
  const [showAddTache,  setShowAddTache]  = useState(false);
  const [nouvelleTache, setNouvelleTache] = useState({ titre: "", description: "", priorite: 2 });

  useEffect(() => { chargerSprints(); }, []);

  const chargerSprints = async () => {
    try {
      const r = await stageScrumAPI.sprints();
      setSprints(r.data);
      const actif = r.data.find(s => s.statut === "en_cours") || r.data[0];
      if (actif) { setSprintActif(actif); chargerTaches(actif.id); }
    } catch {} finally { setLoading(false); }
  };

  const chargerTaches = async (sid) => {
    const r = await stageScrumAPI.taches(sid);
    setTaches(r.data);
  };

  const changerSprint = (s) => { setSprintActif(s); chargerTaches(s.id); };

  const deplacerTache = async (id, statut) => {
    await stageScrumAPI.modifierTache(id, { statut });
    setTaches(t => t.map(tk => tk.id === id ? { ...tk, statut } : tk));
  };

  const supprimerTache = async (id) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    await stageScrumAPI.supprimerTache(id);
    setTaches(t => t.filter(tk => tk.id !== id));
  };

  const ajouterTache = async e => {
    e.preventDefault();
    if (!nouvelleTache.titre.trim()) return;
    try {
      const r = await stageScrumAPI.creerTache({ sprint_id: sprintActif.id, ...nouvelleTache });
      setTaches(t => [...t, r.data]);
      setNouvelleTache({ titre: "", description: "", priorite: 2 });
      setShowAddTache(false);
      toast.success("Tâche ajoutée");
    } catch { toast.error("Erreur"); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  if (!sprints.length) return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tableau Scrum</h1>
      </div>
      <div className="empty-state">
        <p className="empty-state-title">Aucun sprint disponible</p>
        <p className="empty-state-desc">Le backlog Scrum sera généré automatiquement après validation de votre cahier des charges</p>
      </div>
    </div>
  );

  const pct = sprintActif
    ? Math.round((sprintActif.taches_terminees || 0) / (sprintActif.nb_taches || 1) * 100)
    : 0;

  return (
    <div>
      {showReport && sprintActif && (
        <DailyReportModal sprint={sprintActif} onClose={() => setShowReport(false)} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau Scrum</h1>
          <p className="page-subtitle">{sprints.length} sprint(s) — {sprintActif?.titre}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowReport(true)}>Daily Report</button>
          <button className="btn btn-primary" onClick={() => setShowAddTache(true)}>+ Tâche</button>
        </div>
      </div>

      {/* Sélecteur sprints */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {sprints.map(s => (
          <button key={s.id}
            className={`toggle-btn${sprintActif?.id === s.id ? " active" : ""}`}
            onClick={() => changerSprint(s)}>
            Sprint {s.numero}
            <span style={{ marginLeft: 4, fontSize: 11,
              color: s.statut === "en_cours" ? "var(--success)" : "var(--text3)" }}>
              ({s.statut === "en_cours" ? "Actif" : s.statut})
            </span>
          </button>
        ))}
      </div>

      {/* Barre de progression sprint */}
      {sprintActif && (
        <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{sprintActif.titre}</p>
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {sprintActif.taches_terminees}/{sprintActif.nb_taches} tâches — {pct}%
            </p>
          </div>
          <div style={{ height: 8, background: "var(--gray2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", transition: "width .3s" }} />
          </div>
          {sprintActif.date_debut && (
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
              {sprintActif.date_debut} → {sprintActif.date_fin}
            </p>
          )}
        </div>
      )}

      {/* Formulaire ajout tâche */}
      {showAddTache && (
        <div className="card" style={{ marginBottom: 16, maxWidth: 480 }}>
          <form onSubmit={ajouterTache}>
            <div className="field">
              <label className="field-label">Titre de la tâche *</label>
              <input className="field-input" value={nouvelleTache.titre}
                onChange={e => setNouvelleTache(t => ({ ...t, titre: e.target.value }))}
                placeholder="Qu'est-ce qui doit être fait ?" />
            </div>
            <div className="field">
              <label className="field-label">Description</label>
              <textarea className="field-input" rows={2} value={nouvelleTache.description}
                onChange={e => setNouvelleTache(t => ({ ...t, description: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">Priorité</label>
              <select className="field-input" value={nouvelleTache.priorite}
                onChange={e => setNouvelleTache(t => ({ ...t, priorite: +e.target.value }))}>
                <option value={3}>Haute</option>
                <option value={2}>Moyenne</option>
                <option value={1}>Basse</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm">Ajouter</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddTache(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, overflowX: "auto" }}>
        {COLONNES.map(col => {
          const colTaches = taches.filter(t => t.statut === col.key);
          return (
            <div key={col.key} style={{ background: "var(--bg)", borderRadius: 10, padding: 12, minHeight: 400 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</h3>
                <span style={{ background: col.color + "20", color: col.color,
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                  {colTaches.length}
                </span>
              </div>
              {colTaches.map(t => (
                <TacheCard key={t.id} tache={t} onMove={deplacerTache} onDelete={supprimerTache} />
              ))}
              {colTaches.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", paddingTop: 20 }}>
                  Aucune tâche
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
