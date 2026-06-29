import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { stageCandidatureAPI, stageAvancementAPI, stageSujetAPI } from "api/stage";
import { Spinner } from "components/ui";

// ── Icônes SVG professionnelles ───────────────────────────────
const Icon = {
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
      <line x1="2"  y1="20" x2="22" y2="20"/>
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  task: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
};

const ETAPES = [
  { key: "candidature", label: "Candidature",    icon: Icon.file      },
  { key: "analyse",     label: "Profil analysé", icon: Icon.search    },
  { key: "sujet",       label: "Sujet affecté",  icon: Icon.target    },
  { key: "cahier",      label: "Cahier charges", icon: Icon.book      },
  { key: "scrum",       label: "Scrum actif",    icon: Icon.layers    },
];

function IconBox({ icon, color = "var(--blue)", bg = "#EFF6FF", size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <div style={{ width: size * 0.5, height: size * 0.5 }}>{icon}</div>
    </div>
  );
}

export default function StagiaireDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [cand,    setCand]    = useState(null);
  const [stats,   setStats]   = useState(null);
  const [sujets,  setSujets]  = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      stageCandidatureAPI.mes({ page_size: 1 }),
      stageAvancementAPI.stats(),
      stageSujetAPI.lister({ page_size: 1 }),
    ]).then(([r1, r2, r3]) => {
      if (r1.status === "fulfilled") setCand(r1.value.data.items[0] || null);
      if (r2.status === "fulfilled") setStats(r2.value.data);
      if (r3.status === "fulfilled") setSujets(r3.value.data.total);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  const activeSteps = {
    candidature: !!cand,
    analyse:     !!cand,
    sujet:       cand?.statut === "acceptee",
    cahier:      cand?.statut === "acceptee",
    scrum:       stats?.total_taches > 0,
  };

  const STATUT_CFG = {
    en_attente: { label: "En attente",  bg: "#FEF9C3", color: "#854D0E", border: "#FDE047" },
    acceptee:   { label: "Acceptée",    bg: "#DCFCE7", color: "#166534", border: "#86EFAC" },
    refusee:    { label: "Refusée",     bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5" },
  };

  const actions = [
    { label: "Ma candidature de stage",      path: "/stage/candidature", icon: Icon.file,     iconColor: "#3B82F6", iconBg: "#EFF6FF", show: true },
    { label: `${sujets} sujets disponibles`, path: "/stage/sujets",      icon: Icon.target,   iconColor: "#8B5CF6", iconBg: "#F5F3FF", show: true },
    { label: "Analyser mon profil via IA",   path: "/stage/profil",      icon: Icon.search,   iconColor: "#0891B2", iconBg: "#ECFEFF", show: true },
    { label: "Assistant IA",                 path: "/stage/assistant",   icon: Icon.message,  iconColor: "#059669", iconBg: "#ECFDF5", show: true },
    { label: "Tableau Scrum",                path: "/stage/scrum",       icon: Icon.layers,   iconColor: "#D97706", iconBg: "#FFFBEB", show: cand?.statut === "acceptee" },
    { label: "Suivi d'avancement",           path: "/stage/avancement",  icon: Icon.chart,    iconColor: "#DC2626", iconBg: "#FFF5F5", show: cand?.statut === "acceptee" },
    { label: "Cahier des charges",           path: "/stage/cahier",      icon: Icon.book,     iconColor: "#7C3AED", iconBg: "#F5F3FF", show: cand?.statut === "acceptee" },
  ].filter(i => i.show);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #3B82F6, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}>
            <div style={{ width: 22, height: 22 }}>{Icon.user}</div>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text1)", margin: 0 }}>
              Bonjour, {user?.nom?.split(" ")[0]}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text3)", margin: 0, marginTop: 2 }}>
              {user.specialite ? `${user.specialite}${user.universite ? " · " + user.universite : ""}` : "Espace stagiaire"}
            </p>
          </div>
        </div>
        {cand && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20,
            background: STATUT_CFG[cand.statut]?.bg,
            color: STATUT_CFG[cand.statut]?.color,
            border: `1px solid ${STATUT_CFG[cand.statut]?.border}`,
          }}>
            {STATUT_CFG[cand.statut]?.label}
          </span>
        )}
      </div>

      {/* Parcours */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
          Parcours de stage
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
          {ETAPES.map((e, i) => {
            const done    = activeSteps[e.key];
            const current = done && !activeSteps[ETAPES[i + 1]?.key];
            return (
              <div key={e.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Ligne connecteur */}
                {i < ETAPES.length - 1 && (
                  <div style={{
                    position: "absolute", top: 18, left: "50%", width: "100%", height: 2,
                    background: done ? "var(--blue)" : "var(--gray2)",
                    transition: "background 0.3s", zIndex: 0,
                  }} />
                )}
                {/* Cercle */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", zIndex: 1, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "var(--blue)" : "var(--white)",
                  border: `2px solid ${done ? "var(--blue)" : "var(--gray2)"}`,
                  boxShadow: current ? "0 0 0 4px #3B82F620" : "none",
                  color: done ? "#fff" : "var(--text3)",
                  transition: "all 0.3s",
                }}>
                  <div style={{ width: done ? 16 : 16, height: done ? 16 : 16 }}>
                    {done ? Icon.check : e.icon}
                  </div>
                </div>
                <p style={{
                  fontSize: 11, marginTop: 8, textAlign: "center",
                  color: done ? "var(--blue)" : "var(--text3)",
                  fontWeight: done ? 600 : 400,
                }}>
                  {e.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPIs */}
      {stats && stats.avancement_global >= 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { value: `${stats.avancement_global}%`, label: "Avancement global",  icon: Icon.chart,  iconColor: "#3B82F6", iconBg: "#EFF6FF" },
            { value: stats.total_taches,             label: "Tâches totales",     icon: Icon.task,   iconColor: "#7C3AED", iconBg: "#F5F3FF" },
            { value: stats.taches_terminees,         label: "Tâches terminées",   icon: Icon.check,  iconColor: "#059669", iconBg: "#ECFDF5" },
            { value: stats.alertes?.length || 0,     label: "Alertes actives",    icon: Icon.alert,  iconColor: stats.alertes?.length ? "#DC2626" : "var(--text3)", iconBg: stats.alertes?.length ? "#FEF2F2" : "var(--gray1)" },
          ].map(({ value, label, icon, iconColor, iconBg }) => (
            <div key={label} className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <IconBox icon={icon} color={iconColor} bg={iconBg} size={40} />
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text1)", margin: 0, lineHeight: 1.2 }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", margin: 0, marginTop: 2 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenu principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Actions rapides */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            Accès rapide
          </p>
          <div className="card" style={{ padding: 8 }}>
            {actions.map((item, idx) => (
              <div key={item.path}>
                <div
                  onClick={() => navigate(item.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 12px", borderRadius: 8, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--gray1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <IconBox icon={item.icon} color={item.iconColor} bg={item.iconBg} size={34} />
                  <p style={{ fontWeight: 500, fontSize: 13, color: "var(--text1)", flex: 1, margin: 0 }}>
                    {item.label}
                  </p>
                  <div style={{ width: 16, height: 16, color: "var(--text3)" }}>{Icon.arrow}</div>
                </div>
                {idx < actions.length - 1 && (
                  <div style={{ height: 1, background: "var(--gray2)", margin: "0 12px" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Candidature + alertes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: -2 }}>
            État de la candidature
          </p>

          {cand ? (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Dossier #{cand.id}</p>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text1)", margin: 0, marginTop: 2 }}>
                    Candidature de stage
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                  background: STATUT_CFG[cand.statut]?.bg,
                  color: STATUT_CFG[cand.statut]?.color,
                  border: `1px solid ${STATUT_CFG[cand.statut]?.border}`,
                }}>
                  {STATUT_CFG[cand.statut]?.label}
                </span>
              </div>

              {cand.sujet_titre && (
                <div style={{
                  background: "#EFF6FF", border: "1px solid #BFDBFE",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{ width: 16, height: 16, color: "#3B82F6", flexShrink: 0, marginTop: 1 }}>{Icon.target}</div>
                  <p style={{ fontSize: 12, color: "#1D4ED8", margin: 0, fontWeight: 500 }}>{cand.sujet_titre}</p>
                </div>
              )}

              {cand.message_ia && (
                <p style={{
                  fontSize: 12, color: "var(--text2)", lineHeight: 1.7, margin: 0,
                  borderTop: "1px solid var(--gray2)", paddingTop: 12,
                }}>
                  {cand.message_ia.substring(0, 160)}{cand.message_ia.length > 160 ? "…" : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: "28px 20px", textAlign: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: "#EFF6FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", color: "#3B82F6",
              }}>
                <div style={{ width: 26, height: 26 }}>{Icon.file}</div>
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text1)", marginBottom: 6 }}>
                Aucune candidature
              </p>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
                Soumettez votre dossier pour démarrer votre parcours de stage
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/stage/candidature")}>
                Déposer ma candidature
              </button>
            </div>
          )}

          {/* Alertes */}
          {stats?.alertes?.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                Alertes
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.alertes.slice(0, 3).map((a, i) => (
                  <div key={i} style={{
                    background: "#FEF2F2", border: "1px solid #FECACA",
                    borderRadius: 8, padding: "10px 14px",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <div style={{ width: 15, height: 15, color: "#DC2626", flexShrink: 0, marginTop: 1 }}>{Icon.alert}</div>
                    <p style={{ fontSize: 12, color: "#B91C1C", margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
