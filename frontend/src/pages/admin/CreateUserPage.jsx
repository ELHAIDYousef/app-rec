import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "api";
import { Button, ErrorAlert } from "components/ui";
import { getApiError } from "utils/helpers";
import toast from "react-hot-toast";

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ nom: "", email: "", mot_de_passe: "", role: "rh", departement: "" });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState("");

  const validate = () => {
    const e = {};
    if (!form.nom.trim())            e.nom            = "Le nom est obligatoire";
    if (!form.email.trim())          e.email          = "L'email est obligatoire";
    if (!form.mot_de_passe.trim())   e.mot_de_passe   = "Le mot de passe est obligatoire";
    else if (form.mot_de_passe.length < 6) e.mot_de_passe = "Au moins 6 caractères";
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr("");
    try {
      await adminAPI.creerUtilisateur(form);
      toast.success(`Compte créé pour ${form.nom}`);
      navigate("/admin/users");
    } catch (err) { setApiErr(getApiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nouveau compte</h1>
          <p className="page-subtitle">Créer un compte RH Manager ou Administrateur</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/users")}>Retour</Button>
      </div>

      <div className="card">
        <ErrorAlert message={apiErr} />
        <form onSubmit={handleSubmit} noValidate>

          <div className="field">
            <label className="field-label">Nom complet</label>
            <input className={`field-input${errors.nom ? " has-error" : ""}`}
              placeholder="Prénom et nom"
              value={form.nom}
              onChange={e => { setForm({ ...form, nom: e.target.value }); setErrors({ ...errors, nom: "" }); }} />
            {errors.nom && <p className="field-error">{errors.nom}</p>}
          </div>

          <div className="field">
            <label className="field-label">Adresse email</label>
            <input className={`field-input${errors.email ? " has-error" : ""}`}
              type="email" placeholder="utilisateur@exemple.com"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: "" }); }} />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="field">
            <label className="field-label">Rôle</label>
            <select className="field-input" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="rh">RH Manager</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Département <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optionnel)</span></label>
            <input className="field-input"
              placeholder="ex: Ressources Humaines, Direction..."
              value={form.departement}
              onChange={e => setForm({ ...form, departement: e.target.value })} />
          </div>

          <div className="field">
            <label className="field-label">Mot de passe</label>
            <input className={`field-input${errors.mot_de_passe ? " has-error" : ""}`}
              type="password" placeholder="6 caractères minimum"
              value={form.mot_de_passe}
              onChange={e => { setForm({ ...form, mot_de_passe: e.target.value }); setErrors({ ...errors, mot_de_passe: "" }); }} />
            {errors.mot_de_passe && <p className="field-error">{errors.mot_de_passe}</p>}
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <Button type="submit" variant="blue" loading={saving}>Créer le compte</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/admin/users")}>Annuler</Button>
          </div>

        </form>
      </div>
    </div>
  );
}
