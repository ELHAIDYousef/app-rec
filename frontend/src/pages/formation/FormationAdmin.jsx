import { useState, useEffect } from "react";
import { formateurAPI as adminAPI } from "api/formation";

export default function FormationAdmin({ employe, onLogout }) {
  const [onglet,     setOnglet]     = useState("employes");
  const [employes,   setEmployes]   = useState([]);
  const [formations, setFormations] = useState([]);
  const [questions,  setQuestions]  = useState(null);
  const [formateurs, setFormateurs] = useState([]);
  const [msg,        setMsg]        = useState("");
  const [nomEmp,     setNomEmp]     = useState("");
  const [nomForm,   setNomForm]    = useState("");
  const [titreFo,    setTitreFo]    = useState("");
  const [contenuFo,  setContenuFo]  = useState("");
  const [fichierFo,  setFichierFo]  = useState(null);

  useEffect(() => { charger(); }, [onglet]);

  const charger = async () => {
    setMsg("");
    if (onglet === "employes")   setEmployes(await adminAPI.employes());
    if (onglet === "formations") setFormations(await adminAPI.formations());
    if (onglet === "creer-formateur") setFormateurs(await adminAPI.formateurs());
  };

  const creerEmploye = async () => {
    if (!nomEmp.trim()) return;
    try {
      const r = await adminAPI.creerEmploye(nomEmp);
      setMsg(`Employé créé — Code : ${r.code}`);
      setNomEmp(""); charger();
    } catch (e) { setMsg("Erreur : " + e.message); }
  };

  const creerAdmin = async () => {
    if (!nomForm.trim()) return;
    try {
      const r = await adminAPI.creerFormateur(nomForm);
      setMsg(`Administrateur créé — Code : ${r.code}`);
      setNomForm(""); charger();
    } catch (e) { setMsg("Erreur : " + e.message); }
  };

  const creerFormation = async () => {
    if (!titreFo.trim() || (!contenuFo.trim() && !fichierFo))
      return setMsg("Titre et contenu (ou PDF) requis.");
    try {
      setMsg("Génération des questions en cours…");
      const r = await adminAPI.creerFormation(titreFo, contenuFo, fichierFo);
      setMsg(r.message);
      setTitreFo(""); setContenuFo(""); setFichierFo(null);
      charger();
    } catch (e) { setMsg("Erreur : " + e.message); }
  };


  const supprimerEmploye = async (id) => {
    if (!window.confirm("Confirmer la suppression de cet employé ?")) return;
    try {
      await adminAPI.supprimer(id);
      setMsg("Employé supprimé avec succès.");
      charger();
    } catch {
      setMsg("Erreur : impossible de supprimer cet employé.");
    }
  };

  const voirQuestions = async (id) => {
    const q = await adminAPI.questions(id);
    if (q && q.questions) q.questions = q.questions.slice(0, 20);
    setQuestions(q); setOnglet("questions");
  };

  const nav = ["employes", "formations", "nouvelle-formation", "creer-formateur"];
  const labels = {
    employes:           "Employés",
    formations:         "Formations",
    "nouvelle-formation": "Nouvelle formation",
    "creer-formateur":      "Créer formateur",
  };

  const isErr = msg.startsWith("Erreur");

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
        {nav.map(o => (
          <button key={o}
            className={`toggle-btn${onglet === o ? " active" : ""}`}
            onClick={() => setOnglet(o)}>
            {labels[o]}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>

        {msg && (
          <div className={isErr ? "alert-error" : "alert-success"}>{msg}</div>
        )}

        {onglet === "employes" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Employés</h1>
                <p className="page-subtitle">{employes.length} compte(s)</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input className="field-input" value={nomEmp}
                onChange={e => setNomEmp(e.target.value)}
                placeholder="Nom complet de l'employé"
                style={{ flex: 1 }}/>
              <button className="btn btn-blue" onClick={creerEmploye}>Créer</button>
            </div>
            {employes.map(e => (
              <div key={e.id} className="card" style={{ display: "flex",
                justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{e.nom}</span>
                  <code style={{ marginLeft: 10, background: "var(--g1)",
                    padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                    {e.code_employe}
                  </code>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`btn btn-sm ${!e.is_active ? "btn-outline" : "btn-danger"}`}
                    onClick={async () => { await adminAPI.basculerEmploye(e.id); charger(); }}>
                    {e.is_active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => supprimerEmploye(e.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "formations" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Formations</h1>
                <p className="page-subtitle">{formations.length} formation(s)</p>
              </div>
            </div>
            {formations.map(f => (
              <div key={f.id} className="card" style={{ display: "flex",
                justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{f.titre}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: "var(--text3)" }}>
                    {Math.min(f.nb_questions, 20)} question(s)
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline btn-sm"
                    onClick={() => voirQuestions(f.id)}>
                    Voir questions
                  </button>
                  <button className="btn btn-danger btn-sm"
                    onClick={async () => { await adminAPI.supprimerFormation(f.id); charger(); }}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === "nouvelle-formation" && (
          <div>
            <div className="page-header">
              <h1 className="page-title">Nouvelle formation</h1>
            </div>
            <div className="field">
              <label className="field-label">Titre</label>
              <input className="field-input" value={titreFo}
                onChange={e => setTitreFo(e.target.value)}
                placeholder="Titre de la formation"/>
            </div>
            <div className="field">
              <label className="field-label">Contenu</label>
              <textarea className="field-input" value={contenuFo}
                onChange={e => setContenuFo(e.target.value)}
                rows={8} placeholder="Collez le contenu de la formation ici…"/>
            </div>
            <div className="field">
              <label className="field-label">Ou uploadez un PDF</label>
              <input type="file" accept=".pdf"
                onChange={e => setFichierFo(e.target.files[0])}/>
            </div>
            <button className="btn btn-blue" onClick={creerFormation}>
              Créer et générer les questions (IA)
            </button>
          </div>
        )}

        {onglet === "questions" && questions && (
          <div>
            <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }}
              onClick={() => setOnglet("formations")}>
              ← Retour
            </button>
            <div className="page-header">
              <div>
                <h1 className="page-title">{questions.formation}</h1>
                <p className="page-subtitle">{questions.questions.length} questions</p>
              </div>
            </div>
            {questions.questions.map((q, i) => (
              <div key={q.id} className="card" style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: 500, marginBottom: 6 }}>
                  {i + 1}. <span style={{ color: "var(--text3)", fontSize: 12 }}>
                    [{q.type.toUpperCase()}]
                  </span> {q.question}
                </p>
                {q.options && (
                  <div style={{ marginLeft: 14, marginBottom: 8 }}>
                    {q.options.map((o, j) => (
                      <p key={j} style={{ fontSize: 13, color: "var(--text2)",
                                          lineHeight: 1.7 }}>{o}</p>
                    ))}
                  </div>
                )}
                <p className="alert-success" style={{ display: "inline-block",
                  padding: "3px 10px", marginBottom: 0 }}>
                  {q.bonne_reponse}
                </p>
              </div>
            ))}
          </div>
        )}

        {onglet === "creer-formateur" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Formateurs</h1>
                <p className="page-subtitle">{formateurs.length} formateur(s)</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input className="field-input" value={nomForm}
                onChange={e => setNomForm(e.target.value)}
                placeholder="Nom complet du nouveau formateur"
                style={{ flex: 1 }}/>
              <button className="btn btn-blue" onClick={creerAdmin}>Créer</button>
            </div>
            {formateurs.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">Aucun formateur</p>
                <p className="empty-state-desc">Créez le premier formateur ci-dessus.</p>
              </div>
            ) : (
              formateurs.map(f => (
                <div key={f.id} className="card" style={{ display: "flex",
                  justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{f.nom}</span>
                    <code style={{ marginLeft: 10, background: "var(--g1)",
                      padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                      {f.code_employe}
                    </code>
                  </div>
                  <span className="badge badge-rh">Formateur</span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
