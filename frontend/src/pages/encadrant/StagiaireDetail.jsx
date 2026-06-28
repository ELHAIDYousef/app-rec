import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { stageEncadrantAPI } from "api/stage";
import { Spinner } from "components/ui";

const STATUT_COLORS = {
  a_faire:      { bg: "#F3F4F6", color: "#6B7280" },
  en_cours:     { bg: "#EFF6FF", color: "#1D4ED8" },
  en_validation:{ bg: "#FEF9C3", color: "#B45309" },
  termine:      { bg: "#ECFDF5", color: "#059669" },
};
const STATUT_LABELS = {
  a_faire: "À faire", en_cours: "En cours", en_validation: "En validation", termine: "Terminé",
};
const SPRINT_COLORS = { planifie: "#6B7280", en_cours: "#1D4ED8", termine: "#059669" };

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px",
                  color: "var(--text2)", marginBottom: 14 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ProgressBar({ value }) {
  const color = value >= 75 ? "#22C55E" : value >= 40 ? "#3B5BDB" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, background: "var(--g1)", borderRadius: 8, height: 12, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color,
                      borderRadius: 8, transition: "width .5s ease" }} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, minWidth: 42 }}>{value}%</span>
    </div>
  );
}

function TaskPill({ statut }) {
  const s = STATUT_COLORS[statut] || STATUT_COLORS.a_faire;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                   background: s.bg, color: s.color }}>
      {STATUT_LABELS[statut] || statut}
    </span>
  );
}

function CahierSection({ cahier }) {
  if (!cahier) return (
    <div style={{ color: "var(--text3)", fontSize: 13 }}>Cahier des charges non encore généré.</div>
  );
  const c = cahier.contenu || {};
  const sections = [
    ["Présentation",          c.presentation],
    ["Contexte",              c.contexte],
    ["Objectifs",             c.objectifs],
    ["Périmètre fonctionnel", c.perimetre_fonctionnel],
    ["Livrables",             c.livrables],
    ["Critères d'évaluation", c.criteres_evaluation],
    ["Méthodologie",          c.methodologie],
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                       background: cahier.statut === "valide" ? "#ECFDF5" : "#EFF6FF",
                       color: cahier.statut === "valide" ? "#059669" : "#1D4ED8" }}>
          {cahier.statut === "valide" ? "Validé" : "Généré"}
        </span>
      </div>
      {sections.map(([label, val]) => {
        if (!val) return null;
        return (
          <div key={label} style={{ marginBottom: 14 }}>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{label}</p>
            {Array.isArray(val)
              ? <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {val.map((v, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", marginBottom: 2 }}>{v}</li>)}
                </ul>
              : <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{val}</p>
            }
          </div>
        );
      })}
    </div>
  );
}

function SprintBoard({ sprint }) {
  const cols = ["a_faire", "en_cours", "en_validation", "termine"];
  const byStatus = cols.reduce((acc, k) => ({ ...acc, [k]: [] }), {});
  (sprint.taches || []).forEach(t => {
    if (byStatus[t.statut]) byStatus[t.statut].push(t);
    else byStatus.a_faire.push(t);
  });

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          Sprint {sprint.numero} — {sprint.titre}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                       background: "#EFF6FF", color: SPRINT_COLORS[sprint.statut] || "#6B7280" }}>
          {sprint.statut}
        </span>
        {sprint.date_debut && (
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            {sprint.date_debut} → {sprint.date_fin || "?"}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {cols.map(col => (
          <div key={col} style={{ background: "var(--g1)", borderRadius: 8, padding: "8px 10px", minHeight: 60 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)",
                        textTransform: "uppercase", marginBottom: 8 }}>
              {STATUT_LABELS[col]} ({byStatus[col].length})
            </p>
            {byStatus[col].map(t => (
              <div key={t.id} style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 10px",
                                       marginBottom: 6, border: "1px solid var(--g2)" }}>
                <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{t.titre}</p>
                {t.description && (
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.4 }}>
                    {t.description.slice(0, 80)}{t.description.length > 80 ? "…" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsList({ sprints }) {
  const reports = sprints
    .flatMap(s => (s.reports || []).map(r => ({ ...r, sprint_titre: s.titre, sprint_num: s.numero })))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!reports.length) return (
    <div style={{ color: "var(--text3)", fontSize: 13 }}>Aucun daily report soumis.</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {reports.map(r => (
        <div key={r.id} style={{ background: "var(--g1)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{r.date}</span>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>Sprint {r.sprint_num} — {r.sprint_titre}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 4 }}>Réalisé</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{r.realise}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>Difficultés</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{r.difficultes || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>Prévu demain</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{r.prevu}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StagiaireDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [onglet,  setOnglet]  = useState("avancement");

  useEffect(() => {
    stageEncadrantAPI.detail(id)
      .then(r => setData(r.data))
      .catch(() => navigate("/encadrant/stagiaires"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;
  if (!data)   return null;

  const TABS = [
    { key: "avancement",    label: "Avancement" },
    { key: "cahier",        label: "Cahier des charges" },
    { key: "scrum",         label: "Tableau Scrum" },
    { key: "reports",       label: "Daily Reports" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => navigate("/encadrant/stagiaires")}
            style={{ background: "none", border: "none", cursor: "pointer",
                     fontSize: 13, color: "var(--blue)", marginBottom: 6, padding: 0 }}>
            ← Mes stagiaires
          </button>
          <h1 className="page-title">{data.stagiaire_nom}</h1>
          <p className="page-subtitle">{data.stagiaire_email} · {data.sujet_titre || "Sujet non défini"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key}
            className={`toggle-btn${onglet === t.key ? " active" : ""}`}
            onClick={() => setOnglet(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Avancement ── */}
      {onglet === "avancement" && (
        <div>
          <SectionCard title="Progression globale">
            <ProgressBar value={data.avancement_global} />
            <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#3B5BDB" }}>{data.total_taches}</p>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>Tâches totales</p>
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#22C55E" }}>{data.taches_terminees}</p>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>Tâches terminées</p>
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#6B7280" }}>{data.sprints?.length ?? 0}</p>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>Sprints</p>
              </div>
            </div>
          </SectionCard>

          {data.sprints?.length > 0 && (
            <SectionCard title="Sprints">
              {data.sprints.map(s => {
                const total = s.taches?.length || 0;
                const done  = (s.taches || []).filter(t => t.statut === "termine").length;
                const pct   = total ? Math.round(done / total * 100) : 0;
                return (
                  <div key={s.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        Sprint {s.numero} — {s.titre}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text3)" }}>
                        {done}/{total} tâches
                      </span>
                    </div>
                    <div style={{ background: "var(--g1)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6,
                                    background: SPRINT_COLORS[s.statut] || "#6B7280",
                                    transition: "width .4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </SectionCard>
          )}

          {data.profil && (
            <SectionCard title="Profil du stagiaire">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {data.profil.niveau_technique && (
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Niveau</p>
                    <p style={{ fontWeight: 600 }}>{data.profil.niveau_technique}</p>
                  </div>
                )}
                {data.profil.score != null && (
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Score IA</p>
                    <p style={{ fontWeight: 700, color: "#3B5BDB", fontSize: 18 }}>{data.profil.score}/100</p>
                  </div>
                )}
                {data.profil.domaine_recommande && (
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Domaine</p>
                    <p style={{ fontWeight: 600 }}>{data.profil.domaine_recommande}</p>
                  </div>
                )}
              </div>
              {data.profil.technologies_maitrisees?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Technologies maîtrisées</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {data.profil.technologies_maitrisees.map(t => (
                      <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12,
                                             background: "#EFF6FF", color: "#1D4ED8", fontWeight: 500 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Cahier des charges ── */}
      {onglet === "cahier" && (
        <SectionCard title="Cahier des charges">
          <CahierSection cahier={data.cahier} />
        </SectionCard>
      )}

      {/* ── Scrum ── */}
      {onglet === "scrum" && (
        <SectionCard title="Tableau Scrum (lecture seule)">
          {!data.sprints?.length ? (
            <div style={{ color: "var(--text3)", fontSize: 13 }}>Aucun sprint créé.</div>
          ) : (
            data.sprints.map(s => <SprintBoard key={s.id} sprint={s} />)
          )}
        </SectionCard>
      )}

      {/* ── Daily Reports ── */}
      {onglet === "reports" && (
        <SectionCard title="Daily Reports">
          <ReportsList sprints={data.sprints || []} />
        </SectionCard>
      )}
    </div>
  );
}
