import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { applicationsAPI } from "api";
import { useAuth } from "context/AuthContext";
import { Spinner, Button, StatusBadge, ErrorAlert, Avatar } from "components/ui";
import { formatDate, formatDateTime, getApiError } from "utils/helpers";
import toast from "react-hot-toast";

function ScoreRow({ label, score }) {
  if (score == null) return null;
  const color = score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text2)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color }}>{score}/100</span>
      </div>
      <div style={{ height: 7, background: "var(--g1)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: score + "%", height: "100%", background: color, borderRadius: 4, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="dossier-stat">
      <div className="dossier-stat-num" style={{ color: color || "var(--text1)" }}>{value ?? "—"}</div>
      <div className="dossier-stat-label">{label}</div>
    </div>
  );
}

function AtsPanel({ bd, method, loading, onAnalyze }) {
  const matched = bd?.matched_skills || [];
  const missing = bd?.missing_skills || [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "10px 14px", background: "var(--g1)", borderRadius: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500 }}>
            Analyse {method === "nlp" ? "NLP local" : "Groq Llama 3"}
          </p>
          <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 2 }}>
            {method === "nlp" ? "Pipeline offline — rapide et gratuit" : "Analyse IA approfondie via Groq"}
          </p>
        </div>
        <Button variant="blue" size="sm" loading={loading} onClick={onAnalyze}>
          {bd ? "Relancer" : "Lancer l'analyse"}
        </Button>
      </div>

      {!bd ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text3)" }}>
          <p style={{ fontSize: 13 }}>Aucune analyse disponible. Cliquez "Lancer l'analyse".</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <ScoreRow label="Competences (40%)"   score={bd.skills_score} />
            <ScoreRow label="Experience (25%)"    score={bd.experience_score} />
            <ScoreRow label="Motivation (20%)"    score={bd.cover_letter_score} />
            <ScoreRow label="Formation (10%)"     score={bd.education_score} />
            <ScoreRow label="Mots-cles (5%)"      score={bd.keywords_score} />
          </div>

          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                Presentes ({matched.length})
              </p>
              {matched.length === 0
                ? <p style={{ fontSize: 12, color: "var(--text3)" }}>Aucune detectee</p>
                : matched.map(s => (
                  <span key={s} style={{ display: "inline-block", margin: "2px", padding: "2px 8px", background: "var(--green-lt)", border: "1px solid var(--green-bd)", borderRadius: 5, fontSize: 12, color: "var(--success)", fontWeight: 500 }}>{s}</span>
                ))
              }
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                Manquantes ({missing.length})
              </p>
              {missing.length === 0
                ? <p style={{ fontSize: 12, color: "var(--text3)" }}>Aucune</p>
                : missing.map(s => (
                  <span key={s} style={{ display: "inline-block", margin: "2px", padding: "2px 8px", background: "var(--red-lt)", border: "1px solid var(--red-bd)", borderRadius: 5, fontSize: 12, color: "var(--danger)", fontWeight: 500 }}>{s}</span>
                ))
              }
            </div>
          </div>

          {((bd.strengths || []).length > 0 || (bd.weaknesses || []).length > 0) && (
            <div className="grid-2" style={{ marginBottom: 14 }}>
              {(bd.strengths || []).length > 0 && (
                <div style={{ background: "var(--green-lt)", borderRadius: 8, padding: "10px 13px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", marginBottom: 5 }}>Points forts</p>
                  {bd.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: "var(--success)" }}>• {s}</p>)}
                </div>
              )}
              {(bd.weaknesses || []).length > 0 && (
                <div style={{ background: "var(--warning-lt)", borderRadius: 8, padding: "10px 13px" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", marginBottom: 5 }}>Points faibles</p>
                  {bd.weaknesses.map((s, i) => <p key={i} style={{ fontSize: 12, color: "var(--warning)" }}>• {s}</p>)}
                </div>
              )}
            </div>
          )}

          {bd.recommendation && (
            <div style={{ background: "var(--blue-lt)", border: "1px solid var(--blue-bd)", borderRadius: 8, padding: "10px 13px" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)", marginBottom: 3 }}>Recommandation</p>
              <p style={{ fontSize: 13 }}>{bd.recommendation}</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>
            Methode : {bd.scoring_method === "groq_llm" ? "Groq Llama 3" : "NLP local"}
          </p>
        </>
      )}
    </div>
  );
}

export default function CandidateDossierPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user: rh } = useAuth();
  const [app,      setApp]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState("");
  const [error,    setError]    = useState("");
  const [method,   setMethod]   = useState("nlp");
  const [nlpLoad,  setNlpLoad]  = useState(false);
  const [groqLoad,    setGroqLoad]    = useState(false);

  const refresh = async () => {
    const r = await applicationsAPI.obtenir(id);
    setApp(r.data);
  };

  useEffect(() => {
    applicationsAPI.obtenir(id)
      .then(r => { setApp(r.data); setStatus(r.data.statut); })
      .catch(() => { toast.error("Candidature introuvable"); navigate("/applications"); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleNlp = async () => {
    setNlpLoad(true);
    try {
      await applicationsAPI.relancerNLP(id);
      toast.success("Analyse NLP lancee...");
      setTimeout(async () => { try { await refresh(); } finally { setNlpLoad(false); } }, 4000);
    } catch (err) { toast.error(getApiError(err)); setNlpLoad(false); }
  };

  const handleGroq = async () => {
    setGroqLoad(true);
    try {
      await applicationsAPI.relancerGroq(id);
      toast.success("Analyse Groq lancee...");
      setTimeout(async () => { try { await refresh(); } finally { setGroqLoad(false); } }, 5000);
    } catch (err) { toast.error(getApiError(err)); setGroqLoad(false); }
  };

  const handleSaveStatus = async () => {
    setSaving(true); setError("");
    try {
      const r = await applicationsAPI.changerStatut(id, { statut: status });
      setApp(r.data);
      toast.success("Statut mis a jour — email envoye");
    } catch (err) { setError(getApiError(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;
  if (!app)    return null;

  const nlpBd    = app.analyse_nlp  || null;
  const groqBd   = app.analyse_groq || null;
  const activeBd = method === "nlp" ? nlpBd : groqBd;
  const nlpScore  = nlpBd?.ats_score  ?? app.score ?? null;
  const groqScore = groqBd?.ats_score ?? null;
  const statBd    = nlpBd || groqBd || {};
  const matched   = statBd.matched_skills || [];
  const missing   = statBd.missing_skills || [];
  const total     = matched.length + missing.length;
  const matchPct  = total > 0 ? Math.round(matched.length / total * 100) : null;
  const scColor   = nlpScore == null ? "var(--text3)" : nlpScore >= 70 ? "var(--success)" : nlpScore >= 45 ? "var(--warning)" : "var(--danger)";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dossier candidat</h1>
          <p className="page-subtitle">{app.titre_offre}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/applications")}>Retour</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--g2)" }}>
              <Avatar name={app.nom_candidat} role="candidat" size={52} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 600 }}>{app.nom_candidat}</p>
                <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>{app.email_candidat}</p>
                {app.telephone_candidat && <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{app.telephone_candidat}</p>}
              </div>
              {nlpScore != null && (
                <div style={{ textAlign: "center", background: "var(--g1)", borderRadius: 10, padding: "12px 18px" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Score NLP</p>
                  <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: scColor }}>{nlpScore}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>/100</p>
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Statistiques de l'analyse CV</p>
            <div className="dossier-stats">
              <StatBox label="Score NLP"      value={nlpScore}  color={scColor} />
              <StatBox label="Score Groq"     value={groqScore} color={groqScore == null ? "var(--text3)" : groqScore >= 70 ? "var(--success)" : groqScore >= 45 ? "var(--warning)" : "var(--danger)"} />
              <StatBox label="Competences OK" value={matched.length} color="var(--success)" />
              <StatBox label="Taux de match"  value={matchPct != null ? matchPct + "%" : null} color="var(--blue)" />
            </div>

            {matchPct != null && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginBottom: 5 }}>
                  <span>Correspondance avec l'offre</span>
                  <span style={{ fontWeight: 600 }}>{matchPct}%</span>
                </div>
                <div style={{ height: 10, background: "var(--g1)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 5, transition: "width .6s ease", width: matchPct + "%", background: matchPct >= 70 ? "var(--success)" : matchPct >= 40 ? "var(--warning)" : "var(--danger)" }} />
                </div>
              </div>
            )}

            {nlpScore != null && groqScore != null && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--g1)", borderRadius: 8, display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>NLP</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: nlpScore >= 70 ? "var(--success)" : "var(--warning)" }}>{nlpScore}</p>
                </div>
                <p style={{ color: "var(--text3)", fontSize: 16 }}>vs</p>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>Groq</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: groqScore >= 70 ? "var(--success)" : "var(--warning)" }}>{groqScore}</p>
                </div>
                <p style={{ flex: 1, fontSize: 12, color: Math.abs(nlpScore - groqScore) <= 10 ? "var(--success)" : "var(--warning)" }}>
                  {Math.abs(nlpScore - groqScore) <= 10 ? "Les deux methodes sont en accord" : `Ecart de ${Math.abs(nlpScore - groqScore)} points`}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>CV du candidat</p>
            {app.cv_fichier ? (
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="blue"
                  onClick={() => applicationsAPI.telechargerCV(app.id)
                    .catch(err => toast.error(err?.response?.data?.detail || "CV introuvable sur le serveur."))}
                  style={{ flex: 1, justifyContent: "center" }}>
                  Telecharger (PDF)
                </Button>
                <Button variant="outline"
                  onClick={() => applicationsAPI.ouvrirCV(app.id)
                    .catch(err => toast.error(err?.response?.data?.detail || "CV introuvable sur le serveur."))}
                  style={{ flex: 1, justifyContent: "center" }}>
                  Ouvrir dans le navigateur
                </Button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>Ce candidat n'a pas joint de CV.</p>
            )}
          </div>

          <div className="card">
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Lettre de motivation</p>
            <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{app.motivation}</p>
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--g2)" }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Analyse detaillee</p>
              <div className="toggle-group">
                <button className={`toggle-btn${method === "nlp" ? " active" : ""}`} onClick={() => setMethod("nlp")}>
                  NLP{nlpScore != null ? ` (${nlpScore})` : ""}
                </button>
                <button className={`toggle-btn${method === "groq" ? " active" : ""}`} onClick={() => setMethod("groq")}>
                  Groq{groqScore != null ? ` (${groqScore})` : ""}
                </button>
              </div>
            </div>
            <AtsPanel bd={activeBd} method={method} loading={method === "nlp" ? nlpLoad : groqLoad} onAnalyze={method === "nlp" ? handleNlp : handleGroq} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div className="card">
            <p className="section-title">Candidature</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><p className="field-label">Poste</p><p style={{ fontWeight: 500 }}>{app.titre_offre}</p></div>
              <div><p className="field-label">Postule le</p><p style={{ fontSize: 13, color: "var(--text2)" }}>{formatDate(app.postule_le)}</p></div>
              <div><p className="field-label">Statut</p><StatusBadge status={app.statut} /></div>
              {app.nom_traite_par && (
                <div>
                  <p className="field-label">Traité par</p>
                  <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{app.nom_traite_par}</p>
                  {app.statut_modifie_le && (
                    <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{formatDateTime(app.statut_modifie_le)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cal.com — lien à envoyer au candidat */}
          <div className="card">
            <p className="section-title">Cal.com — Entretien</p>
            {rh?.cal_link ? (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--text2)", marginBottom: 10, lineHeight: 1.6 }}>
                  Envoyez ce lien au candidat sélectionné pour réserver un créneau.
                </p>
                <div style={{ background: "var(--g1)", borderRadius: 7, padding: "8px 12px", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: "var(--text3)", wordBreak: "break-all" }}>{rh?.cal_link}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(rh?.cal_link); toast.success("Lien copié !"); }}
                  className="btn btn-outline"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Copier le lien
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 10 }}>Aucun lien Cal.com configuré.</p>
                <a href="/settings" className="btn btn-outline btn-sm">Configurer dans les Paramètres</a>
              </div>
            )}
          </div>

          {/* Modifier le statut */}
          <div className="card">
            <p className="section-title">Modifier le statut</p>
            <ErrorAlert message={error} />
            <div className="field">
              <label className="field-label">Nouveau statut</label>
              <select className="field-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="en_attente">En attente</option>
                <option value="examinee">Examinée</option>
                <option value="selectionne">Sélectionné(e)</option>
                <option value="refusee">Refusée</option>
                <option value="embauche">Embauché(e)</option>
              </select>
            </div>
            {status === "selectionne" && (
              <div className="alert-info" style={{ marginBottom: 12 }}>
                Un email avec le lien Cal.com sera envoyé automatiquement.
              </div>
            )}
            <Button variant="blue" loading={saving} onClick={handleSaveStatus} style={{ width: "100%", justifyContent: "center" }}>
              Enregistrer
            </Button>
          </div>

          {/* Scores enregistrés + relancer */}
          <div className="card">
            <p className="section-title">Scores enregistrés</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>NLP local</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: nlpScore == null ? "var(--text3)" : nlpScore >= 70 ? "var(--success)" : nlpScore >= 45 ? "var(--warning)" : "var(--danger)" }}>
                  {nlpScore ?? "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>Groq LLM</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: groqScore == null ? "var(--text3)" : groqScore >= 70 ? "var(--success)" : groqScore >= 45 ? "var(--warning)" : "var(--danger)" }}>
                  {groqScore ?? "—"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="outline" loading={nlpLoad}  onClick={handleNlp}  style={{ flex: 1, justifyContent: "center" }}>Relancer NLP</Button>
              <Button size="sm" variant="outline" loading={groqLoad} onClick={handleGroq} style={{ flex: 1, justifyContent: "center" }}>Relancer Groq</Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
