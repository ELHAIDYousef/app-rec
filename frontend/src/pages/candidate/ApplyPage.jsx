import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { offresAPI, applicationsAPI } from "api";
import { Spinner, Button, ErrorAlert } from "components/ui";
import { formatDate, getApiError } from "utils/helpers";
import toast from "react-hot-toast";

export default function ApplyPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [offer,   setOffer]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");
  const [errors,  setErrors]  = useState({});

  const [motivation, setMotivation] = useState("");
  const [cvFile,     setCvFile]     = useState(null);

  useEffect(() => {
    offresAPI.obtenir(id)
      .then(r => setOffer(r.data))
      .catch(() => { toast.error("Offre introuvable"); navigate("/offers"); })
      .finally(() => setLoading(false));
  }, [id]);

  const validate = () => {
    const e = {};
    if (!motivation.trim())          e.motivation = "La lettre de motivation est obligatoire";
    else if (motivation.trim().length < 30) e.motivation = "Votre lettre est trop courte (30 caractères minimum)";
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true); setError(""); setErrors({});
    try {
      const fd = new FormData();
      fd.append("offre_id",   id);
      fd.append("motivation", motivation);
      if (cvFile) fd.append("cv", cvFile);
      await applicationsAPI.postuler(fd);
      toast.success("Candidature envoyée !");
      navigate("/my-applications");
    } catch (err) { setError(getApiError(err)); }
    finally { setSending(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;
  if (!offer)  return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Postuler</h1>
          <p className="page-subtitle">{offer.titre}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/offers")}>Retour</Button>
      </div>

      {/* Récapitulatif de l'offre */}
      <div className="card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{offer.titre}</p>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 12 }}>
          {offer.description?.slice(0, 200)}{offer.description?.length > 200 ? "..." : ""}
        </p>
        {(offer.competences || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {offer.competences.map(s => <span key={s} className="skill-tag">{s}</span>)}
          </div>
        )}
        <p style={{ fontSize: 12, color: "var(--text3)" }}>
          Clôture le {formatDate(offer.date_fin)}
        </p>
      </div>

      {/* Formulaire de candidature */}
      <div className="card">
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Votre candidature</p>
        <ErrorAlert message={error} />
        <form onSubmit={handleSubmit} noValidate>

          <div className="field">
            <label className="field-label">Lettre de motivation *</label>
            <textarea
              className={`field-input${errors.motivation ? " has-error" : ""}`}
              rows={8}
              placeholder="Présentez-vous et expliquez pourquoi ce poste vous intéresse. Mentionnez vos expériences et compétences en lien avec l'offre..."
              value={motivation}
              onChange={e => { setMotivation(e.target.value); if (errors.motivation) setErrors({}); }}
            />
            {errors.motivation
              ? <p className="field-error">{errors.motivation}</p>
              : <p className="field-hint">{motivation.length} caractère(s) — minimum 30</p>
            }
          </div>

          <div className="field">
            <label className="field-label">CV (PDF, max 5 Mo)</label>
            <label className="file-upload">
              <span>{cvFile ? cvFile.name : "Cliquez pour ajouter votre CV"}</span>
              <input
                type="file" accept=".pdf"
                style={{ display: "none" }}
                onChange={e => setCvFile(e.target.files[0])}
              />
            </label>
            <p className="field-hint">
              Un CV en PDF améliore votre score d'analyse automatique.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <Button type="submit" variant="blue" loading={sending}>
              Envoyer ma candidature
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/offers")}>
              Annuler
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
