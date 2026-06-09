import { useState } from "react";
import { useAuth } from "context/AuthContext";
import { authAPI } from "api";
import { Button, Input, ErrorAlert, SuccessAlert, Avatar, RoleBadge } from "components/ui";
import { getApiError } from "utils/helpers";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    nom:         user?.nom         || "",
    telephone:   user?.telephone   || "",
    departement: user?.departement || "",
  });
  const [pwForm, setPwForm] = useState({ mot_de_passe_actuel: "", nouveau_mot_de_passe: "", confirm: "" });

  const [msg,    setMsg]    = useState({ error: "", success: "" });
  const [pwMsg,  setPwMsg]  = useState({ error: "", success: "" });
  const [pwErrs, setPwErrs] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleProfile = async e => {
    e.preventDefault();
    if (!form.nom.trim()) { setMsg({ error: "Le nom est obligatoire", success: "" }); return; }
    setMsg({ error: "", success: "" }); setSaving(true);
    try {
      const r = await authAPI.modifierProfil({ nom: form.nom, telephone: form.telephone, departement: form.departement });
      updateUser(r.data);
      setMsg({ error: "", success: "Profil mis à jour." });
      toast.success("Profil mis à jour !");
    } catch (err) { setMsg({ error: getApiError(err), success: "" }); }
    finally { setSaving(false); }
  };

  const validatePassword = () => {
    const e = {};
    if (!pwForm.mot_de_passe_actuel.trim()) e.mot_de_passe_actuel = "Le mot de passe actuel est requis";
    if (!pwForm.nouveau_mot_de_passe.trim())     e.nouveau_mot_de_passe     = "Le nouveau mot de passe est requis";
    else if (pwForm.nouveau_mot_de_passe.length < 6) e.nouveau_mot_de_passe = "Au moins 6 caractères";
    if (pwForm.nouveau_mot_de_passe !== pwForm.confirm) e.confirm   = "Les mots de passe ne correspondent pas";
    return e;
  };

  const handlePassword = async e => {
    e.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length) { setPwErrs(errs); return; }
    setPwErrs({}); setPwMsg({ error: "", success: "" }); setPwSaving(true);
    try {
      await authAPI.changerMotDePasse({ mot_de_passe_actuel: pwForm.mot_de_passe_actuel, nouveau_mot_de_passe: pwForm.nouveau_mot_de_passe });
      setPwMsg({ error: "", success: "Mot de passe modifié." });
      setPwForm({ mot_de_passe_actuel: "", nouveau_mot_de_passe: "", confirm: "" });
      toast.success("Mot de passe modifié !");
    } catch (err) { setPwMsg({ error: getApiError(err), success: "" }); }
    finally { setPwSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon profil</h1>
          <p className="page-subtitle">Gérez vos informations personnelles</p>
        </div>
      </div>

      <div className="grid-2" style={{ maxWidth: 820, alignItems: "start" }}>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--g2)" }}>
            <Avatar name={user?.nom} role={user?.role} size={48} />
            <div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{user?.nom}</p>
              <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{user?.email}</p>
              <div style={{ marginTop: 6 }}><RoleBadge role={user?.role} /></div>
            </div>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Modifier mes informations</p>
          <ErrorAlert message={msg.error} />
          <SuccessAlert message={msg.success} />
          <form onSubmit={handleProfile} noValidate>
            <Input label="Nom complet" value={form.nom}
              onChange={e => setForm({ ...form, nom: e.target.value })} />
            <Input label="Téléphone" placeholder="+216 xx xxx xxx" value={form.telephone}
              onChange={e => setForm({ ...form, telephone: e.target.value })} />
            {user?.role !== "candidat" && (
              <Input label="Département" placeholder="Ressources Humaines" value={form.departement}
                onChange={e => setForm({ ...form, departement: e.target.value })} />
            )}
            <Button type="submit" variant="blue" loading={saving}>Enregistrer</Button>
          </form>
        </div>

        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Changer le mot de passe</p>
          <ErrorAlert message={pwMsg.error} />
          <SuccessAlert message={pwMsg.success} />
          <form onSubmit={handlePassword} noValidate>
            <div className="field">
              <label className="field-label">Mot de passe actuel</label>
              <input type="password" className={`field-input${pwErrs.mot_de_passe_actuel ? " has-error" : ""}`}
                placeholder="••••••••" value={pwForm.mot_de_passe_actuel}
                onChange={e => setPwForm({ ...pwForm, mot_de_passe_actuel: e.target.value })} />
              {pwErrs.mot_de_passe_actuel && <p className="field-error">{pwErrs.mot_de_passe_actuel}</p>}
            </div>
            <div className="field">
              <label className="field-label">Nouveau mot de passe</label>
              <input type="password" className={`field-input${pwErrs.nouveau_mot_de_passe ? " has-error" : ""}`}
                placeholder="6 caractères minimum" value={pwForm.nouveau_mot_de_passe}
                onChange={e => setPwForm({ ...pwForm, nouveau_mot_de_passe: e.target.value })} />
              {pwErrs.nouveau_mot_de_passe && <p className="field-error">{pwErrs.nouveau_mot_de_passe}</p>}
            </div>
            <div className="field">
              <label className="field-label">Confirmer le nouveau mot de passe</label>
              <input type="password" className={`field-input${pwErrs.confirm ? " has-error" : ""}`}
                placeholder="••••••••" value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              {pwErrs.confirm && <p className="field-error">{pwErrs.confirm}</p>}
            </div>
            <Button type="submit" variant="outline" loading={pwSaving}>
              Modifier le mot de passe
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
