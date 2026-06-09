import { useEffect, useState } from "react";
import { authAPI } from "api";
import api from "api";
import { Button, ErrorAlert, SuccessAlert } from "components/ui";
import { getApiError } from "utils/helpers";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [form,       setForm]       = useState({ cal_link: "", cal_api_key: "" });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [success,    setSuccess]    = useState("");
  const [testResult, setTestResult] = useState(null);
  const [showKey,    setShowKey]    = useState(false);

  useEffect(() => {
    authAPI.me().then(r => {
      setForm({ cal_link: r.data.cal_link || "", cal_api_key: r.data.cal_api_key || "" });
    }).finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const e = {};
    if (form.cal_link && !form.cal_link.startsWith("http"))
      e.cal_link = "Le lien doit commencer par http:// ou https://";
    return e;
  };

  const handleSave = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setSuccess(""); setSaving(true);
    try {
      await api.patch("/api/auth/moi/cal", {
        cal_link:    form.cal_link    || null,
        cal_api_key: form.cal_api_key || null,
      });
      setSuccess("Paramètres enregistrés.");
      toast.success("Sauvegardé !");
      setTestResult(null);
    } catch (err) { setErrors({ submit: getApiError(err) }); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await api.get("/api/cal/test");
      setTestResult(r.data.statut === "connecte"
        ? { ok: true,  msg: r.data.message }
        : { ok: false, msg: r.data.message });
    } catch (err) {
      setTestResult({ ok: false, msg: err?.response?.data?.detail || "Connexion impossible" });
    } finally { setTesting(false); }
  };

  if (loading) return <div className="loading-page"><span>Chargement...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Votre configuration Cal.com personnelle</p>
        </div>
      </div>

      <div style={{ maxWidth: 540 }}>
        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Cal.com</p>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 18 }}>
            Chaque RH Manager possède son propre lien et sa propre clé API.
            Ces informations sont utilisées pour planifier les entretiens avec les candidats sélectionnés.
          </p>

          {errors.submit && <div className="alert-error">{errors.submit}</div>}
          <SuccessAlert message={success} />

          <form onSubmit={handleSave} noValidate>
            <div className="field">
              <label className="field-label">Votre lien de réservation</label>
              <input
                className={`field-input${errors.cal_link ? " has-error" : ""}`}
                type="url"
                placeholder="https://cal.com/votre-nom/entretien"
                value={form.cal_link}
                onChange={e => { setForm({ ...form, cal_link: e.target.value }); setErrors({}); }}
              />
              {errors.cal_link
                ? <p className="field-error">{errors.cal_link}</p>
                : <p className="field-hint">Ce lien est envoyé automatiquement aux candidats que vous sélectionnez</p>
              }
            </div>

            <div className="field">
              <label className="field-label">Votre clé API Cal.com</label>
              <div style={{ position: "relative" }}>
                <input
                  className="field-input"
                  type={showKey ? "text" : "password"}
                  placeholder="cal_live_xxxxxxxxxxxx"
                  value={form.cal_api_key}
                  onChange={e => setForm({ ...form, cal_api_key: e.target.value })}
                  style={{ paddingRight: 80 }}
                />
                <button type="button" onClick={() => setShowKey(!showKey)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text3)", cursor: "pointer" }}>
                  {showKey ? "Masquer" : "Afficher"}
                </button>
              </div>
              <p className="field-hint">Cal.com → Settings → Developer → API keys</p>
            </div>

            {form.cal_api_key && (
              <div style={{ marginBottom: 16 }}>
                <Button type="button" variant="outline" size="sm" loading={testing} onClick={handleTest}>
                  Tester la connexion
                </Button>
                {testResult && (
                  <div className={testResult.ok ? "alert-success" : "alert-error"} style={{ marginTop: 10, marginBottom: 0 }}>
                    {testResult.ok ? "Connecté — " : "Erreur — "}{testResult.msg}
                  </div>
                )}
              </div>
            )}

            {form.cal_link && (
              <div className="alert-info" style={{ marginBottom: 16 }}>
                Lien actuel : <strong>{form.cal_link}</strong>
              </div>
            )}

            <Button type="submit" variant="blue" loading={saving}>Enregistrer</Button>
          </form>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Obtenir une clé API Cal.com</p>
          <ol style={{ fontSize: 13, color: "var(--text2)", paddingLeft: 18, lineHeight: 2.1 }}>
            <li>Allez sur <a href="https://cal.com" target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>cal.com</a> et connectez-vous</li>
            <li>Settings → Developer → API keys</li>
            <li>Add new key → donnez un nom → Save</li>
            <li>Copiez la clé et collez-la ci-dessus</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
