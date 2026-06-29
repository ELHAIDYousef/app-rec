import { useState, useEffect } from "react";
import { stageSujetAPI, stageCandidatureAPI, stageAffectationAPI, stageCahierAPI, stageScrumAPI } from "api/stage";
import { adminAPI } from "api";
import { Pagination, Spinner } from "components/ui";
import toast from "react-hot-toast";

const PAGE_SIZE = 10;
const STATUT_COLORS = {
  disponible: "#22C55E", reserve: "#F59E0B", affecte: "#3B82F6", termine: "#6B7280",
};
const STATUTS_CAND = { en_attente: "En attente", acceptee: "Acceptée", refusee: "Refusée" };

function SujetForm({ sujet, encadrants, onSave, onCancel }) {
  const [form, setForm] = useState({
    titre:         sujet?.titre || "",
    description:   sujet?.description || "",
    technologies:  sujet?.technologies?.join(", ") || "",
    niveau_requis: sujet?.niveau_requis || "",
    encadrant:     sujet?.encadrant || "",
    encadrant_id:  sujet?.encadrant_id || null,
  });
  const [saving, setSaving] = useState(false);

  const save = async e => {
    e.preventDefault();
    if (!form.titre.trim() || !form.description.trim()) { toast.error("Titre et description requis"); return; }
    setSaving(true);
    try {
      const data = {
        titre:         form.titre,
        description:   form.description,
        technologies:  form.technologies.split(",").map(t => t.trim()).filter(Boolean),
        niveau_requis: form.niveau_requis || null,
        encadrant:     form.encadrant || null,
        encadrant_id:  form.encadrant_id || null,
      };
      if (sujet) await stageSujetAPI.modifier(sujet.id, data);
      else       await stageSujetAPI.creer(data);
      toast.success(sujet ? "Sujet modifié" : "Sujet créé");
      onSave();
    } catch { toast.error("Erreur"); } finally { setSaving(false); }
  };

  return (
    <div className="card" style={{ maxWidth: 640, marginBottom: 20 }}>
      <h3 style={{ fontWeight: 600, marginBottom: 16 }}>{sujet ? "Modifier le sujet" : "Nouveau sujet de stage"}</h3>
      <form onSubmit={save}>
        <div className="field">
          <label className="field-label">Titre *</label>
          <input className="field-input" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
        </div>
        <div className="field">
          <label className="field-label">Description *</label>
          <textarea className="field-input" rows={4} value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label className="field-label">Technologies (séparées par virgule)</label>
            <input className="field-input" value={form.technologies} placeholder="React, FastAPI, MySQL..."
              onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field-label">Niveau requis</label>
            <select className="field-input" value={form.niveau_requis}
              onChange={e => setForm(f => ({ ...f, niveau_requis: e.target.value }))}>
              <option value="">Tous niveaux</option>
              <option value="licence">Licence</option>
              <option value="master">Master</option>
              <option value="ingenieur">Ingénieur</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field-label">Encadrant</label>
          <select className="field-input"
            value={form.encadrant_id || ""}
            onChange={e => {
              const id  = e.target.value ? parseInt(e.target.value) : null;
              const enc = encadrants.find(u => u.id === id);
              setForm(f => ({ ...f, encadrant_id: id, encadrant: enc?.nom || "" }));
            }}>
            <option value="">— Sélectionner un encadrant —</option>
            {encadrants.map(u => (
              <option key={u.id} value={u.id}>{u.nom}</option>
            ))}
          </select>
          {form.encadrant && !form.encadrant_id && (
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
              Actuel : {form.encadrant} (sélectionnez ci-dessus pour lier un compte)
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Enregistrement..." : sujet ? "Enregistrer" : "Créer le sujet"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel}>Annuler</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminSujetsPage() {
  const [onglet, setOnglet] = useState("sujets");

  // ── Encadrants ────────────
  const [encadrants, setEncadrants] = useState([]);

  // ── Sujets ────────────
  const [sujets,       setSujets]       = useState([]);
  const [totalS,       setTotalS]       = useState(0);
  const [pageS,        setPageS]        = useState(1);
  const [pagesS,       setPagesS]       = useState(1);
  const [loadingS,     setLoadingS]     = useState(true);
  const [editSujet,    setEditSujet]    = useState(null);
  const [showForm,     setShowForm]     = useState(false);

  // ── Candidatures stage ────────────
  const [cands,        setCands]        = useState([]);
  const [totalC,       setTotalC]       = useState(0);
  const [pageC,        setPageC]        = useState(1);
  const [pagesC,       setPagesC]       = useState(1);
  const [loadingC,     setLoadingC]     = useState(false);
  const [matching,     setMatching]     = useState({});
  const [matchResult,  setMatchResult]  = useState(null);
  const [selCand,      setSelCand]      = useState(null);

  useEffect(() => {
    chargerSujets(1);
    adminAPI.listerUtilisateurs({ page: 1, page_size: 100 })
      .then(r => setEncadrants((r.data.items || []).filter(u => u.role === "encadrant")))
      .catch(() => {});
  }, []);

  const chargerSujets = async p => {
    setLoadingS(true);
    try {
      const r = await stageSujetAPI.lister({ page: p, page_size: PAGE_SIZE });
      setSujets(r.data.items); setTotalS(r.data.total);
      setPageS(r.data.page); setPagesS(r.data.pages);
    } catch {} finally { setLoadingS(false); }
  };

  const chargerCandidatures = async p => {
    setLoadingC(true);
    try {
      const r = await stageCandidatureAPI.lister({ page: p, page_size: PAGE_SIZE });
      setCands(r.data.items); setTotalC(r.data.total);
      setPageC(r.data.page); setPagesC(r.data.pages);
    } catch {} finally { setLoadingC(false); }
  };

  useEffect(() => {
    if (onglet === "candidatures") chargerCandidatures(1);
  }, [onglet]);

  const supprimer = async id => {
    if (!window.confirm("Supprimer ce sujet ?")) return;
    await stageSujetAPI.supprimer(id);
    toast.success("Sujet supprimé"); chargerSujets(pageS);
  };

  const changerStatutSujet = async (id, statut) => {
    await stageSujetAPI.changerStatut(id, { statut });
    chargerSujets(pageS);
  };

  const matcher = async (cid) => {
    setMatching(m => ({ ...m, [cid]: true }));
    try {
      const r = await stageAffectationAPI.matcher(cid);
      setMatchResult(r.data); setSelCand(cands.find(c => c.id === cid));
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur matching"); }
    finally { setMatching(m => ({ ...m, [cid]: false })); }
  };

  const affecter = async (cid, sujetId) => {
    try {
      await stageAffectationAPI.affecter(cid, { sujet_id: sujetId });
      toast.success("Sujet affecté !"); setMatchResult(null); chargerCandidatures(pageC);
    } catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
  };

  const genererCahier = async (cid) => {
    toast.loading("Génération du cahier des charges (30-60s)...", { id: "cahier", duration: Infinity });
    try {
      await stageCahierAPI.generer(cid);
      toast.success("Cahier des charges généré !", { id: "cahier", duration: 4000 });
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Erreur lors de la génération";
      toast.error(msg, { id: "cahier", duration: 6000 });
    }
  };

  const genererBacklog = async (cid) => {
    toast.loading("Génération du backlog Scrum (30-60s)...", { id: "backlog", duration: Infinity });
    try {
      const r = await stageScrumAPI.genererBacklog(cid);
      toast.success(r.data.message || "Backlog généré !", { id: "backlog", duration: 4000 });
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Erreur lors de la génération";
      toast.error(msg, { id: "backlog", duration: 6000 });
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Stages</h1>
          <p className="page-subtitle">Sujets, candidatures, affectations et suivi</p>
        </div>
        {onglet === "sujets" && (
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditSujet(null); }}>
            + Nouveau sujet
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["sujets","Sujets de stage"],["candidatures","Candidatures"]].map(([k,l]) => (
          <button key={k} className={`toggle-btn${onglet===k?" active":""}`} onClick={() => setOnglet(k)}>{l}</button>
        ))}
      </div>

      {/* ── SUJETS ── */}
      {onglet === "sujets" && (
        <div>
          {(showForm || editSujet) && (
            <SujetForm
              sujet={editSujet}
              encadrants={encadrants}
              onSave={() => { setShowForm(false); setEditSujet(null); chargerSujets(1); }}
              onCancel={() => { setShowForm(false); setEditSujet(null); }}
            />
          )}
          {loadingS ? <div className="loading-page"><Spinner size={24}/></div> : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Titre</th><th>Niveau</th><th>Technologies</th><th>Encadrant</th><th>Statut</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sujets.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.titre}</td>
                        <td><span style={{ fontSize: 12, color: "var(--text3)" }}>{s.niveau_requis || "—"}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(s.technologies || []).slice(0, 3).map(t => (
                              <span key={t} style={{ fontSize: 11, padding: "1px 6px", borderRadius: 3,
                                background: "#EFF6FF", color: "#1D4ED8" }}>{t}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: "var(--text2)" }}>{s.encadrant || "—"}</td>
                        <td>
                          <select value={s.statut} onChange={e => changerStatutSujet(s.id, e.target.value)}
                            style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--gray2)",
                              color: STATUT_COLORS[s.statut], fontWeight: 600 }}>
                            {["disponible","reserve","affecte","termine"].map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditSujet(s); setShowForm(false); }}>
                              Modifier
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => supprimer(s.id)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageS} pages={pagesS} total={totalS} onChange={chargerSujets} />
            </>
          )}
        </div>
      )}

      {/* ── CANDIDATURES ── */}
      {onglet === "candidatures" && (
        <div>
          {matchResult && selCand && (
            <div className="card" style={{ marginBottom: 20, border: "2px solid var(--blue)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontWeight: 600 }}>Résultat matching IA — {selCand.stagiaire_nom}</h3>
                <button onClick={() => setMatchResult(null)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18 }}>✕</button>
              </div>
              {matchResult.sujet_optimal && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#1D4ED8" }}>Sujet optimal : {matchResult.sujet_optimal.titre}</p>
                      <p style={{ fontSize: 12, color: "#3B82F6", marginTop: 4 }}>{matchResult.justification}</p>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 60 }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: "#1D4ED8" }}>{matchResult.score_optimal}</p>
                      <p style={{ fontSize: 11, color: "var(--text3)" }}>/ 100</p>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                    onClick={() => affecter(selCand.id, matchResult.sujet_optimal.id)}>
                    Affecter ce sujet
                  </button>
                </div>
              )}
              {matchResult.classement?.slice(1).map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", background: "var(--bg)", borderRadius: 6, marginBottom: 6 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{s.titre}</p>
                    <p style={{ fontSize: 12, color: "var(--text3)" }}>{s.raison}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--blue)" }}>{s.score}/100</span>
                    <button className="btn btn-outline btn-sm" onClick={() => affecter(selCand.id, s.id)}>Affecter</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loadingC ? <div className="loading-page"><Spinner size={24}/></div> : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Stagiaire</th><th>Soumise le</th><th>CV</th><th>Statut</th><th>Sujet</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {cands.map(c => (
                      <tr key={c.id}>
                        <td>
                          <p style={{ fontWeight: 500 }}>{c.stagiaire_nom}</p>
                          <p style={{ fontSize: 12, color: "var(--text3)" }}>{c.stagiaire_email}</p>
                        </td>
                        <td style={{ fontSize: 13, color: "var(--text3)" }}>
                          {new Date(c.cree_le).toLocaleDateString("fr-FR")}
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: c.cv_fichier ? "var(--success)" : "var(--text3)" }}>
                            {c.cv_fichier ? "Oui" : "Non"}
                          </span>
                        </td>
                        <td>
                          <select value={c.statut}
                            onChange={async e => {
                              await stageCandidatureAPI.changerStatut(c.id, { statut: e.target.value });
                              chargerCandidatures(pageC);
                            }}
                            style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--gray2)" }}>
                            {Object.entries(STATUTS_CAND).map(([k,v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontSize: 13 }}>{c.sujet_titre || <span style={{ color: "var(--text3)" }}>—</span>}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="btn btn-outline btn-sm" disabled={matching[c.id]}
                              onClick={() => matcher(c.id)}>
                              {matching[c.id] ? "..." : "Matcher IA"}
                            </button>
                            {c.statut === "acceptee" && c.sujet_titre && (
                              <>
                                <button className="btn btn-outline btn-sm" onClick={() => genererCahier(c.id)}>
                                  Cahier IA
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => genererBacklog(c.id)}>
                                  Backlog IA
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageC} pages={pagesC} total={totalC} onChange={chargerCandidatures} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
