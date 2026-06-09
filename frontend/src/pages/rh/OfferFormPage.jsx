import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { offresAPI, aiAPI } from "api";
import { Button, ErrorAlert, Spinner } from "components/ui";
import { getApiError } from "utils/helpers";
import toast from "react-hot-toast";

const VIDE = { titre: "", description: "", competences: "", date_debut: "", date_fin: "", statut: "ouverte" };

export default function OfferFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form,         setForm]         = useState(VIDE);
  const [loading,      setLoading]      = useState(isEdit);
  const [saving,       setSaving]       = useState(false);
  const [errors,       setErrors]       = useState({});
  const [aiNotes,      setAiNotes]      = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError,      setAiError]      = useState("");
  const [showAi,       setShowAi]       = useState(true);

  useEffect(() => {
    if (!isEdit) return;
    offresAPI.obtenir(id)
      .then(r => {
        const o = r.data;
        setForm({
          titre:       o.titre,
          description: o.description,
          competences: (o.competences || []).join(", "),
          date_debut:  o.date_debut,
          date_fin:    o.date_fin,
          statut:      o.statut,
        });
      })
      .catch(() => { toast.error("Offre introuvable"); navigate("/manage-offers"); })
      .finally(() => setLoading(false));
  }, [id]);

  const validate = () => {
    const e = {};
    if (!form.titre.trim())       e.titre      = "Le titre est obligatoire";
    if (!form.description.trim()) e.description = "La description est obligatoire";
    if (!form.date_debut)         e.date_debut  = "La date d'ouverture est obligatoire";
    if (!form.date_fin)           e.date_fin    = "La date de clôture est obligatoire";
    if (form.date_debut && form.date_fin && form.date_fin < form.date_debut)
      e.date_fin = "La date de clôture doit être après la date d'ouverture";
    return e;
  };

  const handleGenerate = async () => {
    if (!form.titre.trim() && !aiNotes.trim()) {
      setAiError("Renseignez au moins le titre ou des notes.");
      return;
    }
    setAiError(""); setAiGenerating(true);
    try {
      const competences = form.competences.split(",").map(s => s.trim()).filter(Boolean);
      const r = await aiAPI.genererOffre({
        titre:       form.titre || "Poste à définir",
        competences,
        notes:       aiNotes,
      });
      setForm(prev => ({ ...prev, description: r.data.description }));
      toast.success("Description générée !");
    } catch (err) { setAiError(getApiError(err)); }
    finally { setAiGenerating(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setSaving(true);
    try {
      const payload = {
        titre:       form.titre.trim(),
        description: form.description.trim(),
        competences: form.competences.split(",").map(s => s.trim()).filter(Boolean),
        date_debut:  form.date_debut,
        date_fin:    form.date_fin,
        statut:      form.statut,
      };
      if (isEdit) { await offresAPI.modifier(id, payload); toast.success("Offre mise à jour !"); }
      else        { await offresAPI.creer(payload);        toast.success("Offre publiée !"); }
      navigate("/manage-offers");
    } catch (err) { setErrors({ submit: getApiError(err) }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const competencesList = form.competences.split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? "Modifier l'offre" : "Nouvelle offre"}</h1>
          <p className="page-subtitle">{isEdit ? "Modifiez les informations" : "Publiez une nouvelle offre"}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/manage-offers")}>Retour</Button>
      </div>

      {/* Assistant IA */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showAi ? 16 : 0 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Assistant IA</p>
            <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>
              Décrivez votre besoin, l'IA rédige la description
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setShowAi(!showAi); setAiError(""); }}>
            {showAi ? "Masquer" : "Afficher"}
          </Button>
        </div>

        {showAi && (
          <div>
            <hr style={{ border: "none", borderTop: "1px solid var(--gray2)", marginBottom: 16 }} />
            {aiError && <div className="alert-error">{aiError}</div>}
            <div className="field">
              <label className="field-label">Informations supplémentaires</label>
              <textarea
                className="field-input"
                rows={3}
                placeholder="Ex : startup fintech, profil junior, télétravail, environnement agile..."
                value={aiNotes}
                onChange={e => setAiNotes(e.target.value)}
              />
            </div>
            <Button variant="blue" onClick={handleGenerate} loading={aiGenerating}>
              {aiGenerating ? "Génération en cours..." : "Générer la description"}
            </Button>
            {form.description && (
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 10 }}>
                Description insérée ci-dessous — vous pouvez la modifier.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Formulaire */}
      <div className="card">
        {errors.submit && <div className="alert-error">{errors.submit}</div>}
        <form onSubmit={handleSubmit} noValidate>

          <div className="field">
            <label className="field-label">Titre du poste *</label>
            <input
              className={`field-input${errors.titre ? " has-error" : ""}`}
              placeholder="Ex : Développeur Full Stack, Chef de Projet..."
              value={form.titre}
              onChange={e => { setForm({ ...form, titre: e.target.value }); if (errors.titre) setErrors({}); }}
            />
            {errors.titre && <p className="field-error">{errors.titre}</p>}
          </div>

          <div className="field">
            <label className="field-label">
              Description *
              {form.description && (
                <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 8, fontSize: 11 }}>
                  {form.description.length} caractères
                </span>
              )}
            </label>
            <textarea
              className={`field-input${errors.description ? " has-error" : ""}`}
              rows={8}
              placeholder="Décrivez les missions, le profil recherché, les conditions..."
              value={form.description}
              onChange={e => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors({}); }}
            />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>

          <div className="field">
            <label className="field-label">Compétences requises</label>
            <input
              className="field-input"
              placeholder="React, Node.js, MySQL, Docker..."
              value={form.competences}
              onChange={e => setForm({ ...form, competences: e.target.value })}
            />
            <p className="field-hint">Séparées par des virgules — utilisées pour le scoring automatique des CV</p>
            {competencesList.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {competencesList.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="field-label">Date d'ouverture *</label>
              <input
                className={`field-input${errors.date_debut ? " has-error" : ""}`}
                type="date" value={form.date_debut}
                onChange={e => { setForm({ ...form, date_debut: e.target.value }); if (errors.date_debut) setErrors({}); }}
              />
              {errors.date_debut && <p className="field-error">{errors.date_debut}</p>}
            </div>
            <div className="field">
              <label className="field-label">Date de clôture *</label>
              <input
                className={`field-input${errors.date_fin ? " has-error" : ""}`}
                type="date" value={form.date_fin}
                min={form.date_debut || undefined}
                onChange={e => { setForm({ ...form, date_fin: e.target.value }); if (errors.date_fin) setErrors({}); }}
              />
              {errors.date_fin && <p className="field-error">{errors.date_fin}</p>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Statut</label>
            <select className="field-input" value={form.statut}
              onChange={e => setForm({ ...form, statut: e.target.value })}>
              <option value="ouverte">Ouverte — visible par les candidats</option>
              <option value="fermee">Fermée — masquée aux candidats</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <Button type="submit" variant="blue" loading={saving}>
              {isEdit ? "Enregistrer" : "Publier l'offre"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/manage-offers")}>
              Annuler
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
