import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { adminAPI, applicationsAPI, calAPI } from "api";
import { Spinner, Avatar } from "components/ui";
import { formatDate } from "utils/helpers";

// ── Palette couleurs statuts ──────────────────────────────
const STATUT_COLORS = {
  en_attente:  "#F59E0B",
  examinee:    "#3B82F6",
  selectionne: "#8B5CF6",
  refusee:     "#EF4444",
  embauche:    "#22C55E",
};
const STATUT_LABELS = {
  en_attente:  "En attente",
  examinee:    "Examinée",
  selectionne: "Sélectionné(e)",
  refusee:     "Refusée",
  embauche:    "Embauché(e)",
};
const BAR_COLORS = ["#3B5BDB","#0CA678","#F59F00","#F03E3E","#7048E8","#1098AD"];

// ── Génère les 6 derniers mois ────────────────────────────
function getLast6Months() {
  const res = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    res.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
    });
  }
  return res;
}

// ── Carte stat ────────────────────────────────────────────
function StatCard({ num, label, color, sub }) {
  const colors = { blue: "#3B5BDB", green: "#22C55E", yellow: "#F59E0B", red: "#EF4444", purple: "#8B5CF6" };
  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4, color: colors[color] || "var(--text1)" }}>
        {num ?? "—"}
      </div>
      <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{label}</div>
      {sub != null && (
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Donut SVG ─────────────────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 13, padding: "24px 0" }}>
      Aucune candidature
    </div>
  );

  const size = 160, cx = 80, cy = 80, R = 60, r = 36;
  let angle = -Math.PI / 2;

  const arcs = segments
    .filter(d => d.value > 0)
    .map(d => {
      const a  = (d.value / total) * Math.PI * 2;
      const ea = angle + a;
      const lg = a > Math.PI ? 1 : 0;
      const c1 = Math.cos(angle), s1 = Math.sin(angle);
      const c2 = Math.cos(ea),   s2 = Math.sin(ea);
      const path = [
        `M ${cx + R * c1} ${cy + R * s1}`,
        `A ${R} ${R} 0 ${lg} 1 ${cx + R * c2} ${cy + R * s2}`,
        `L ${cx + r * c2} ${cy + r * s2}`,
        `A ${r} ${r} 0 ${lg} 0 ${cx + r * c1} ${cy + r * s1}`,
        "Z",
      ].join(" ");
      angle = ea;
      return { ...d, path };
    });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flex: "none" }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle"
          style={{ fontSize: 22, fontWeight: 700, fill: "var(--text1)", fontFamily: "Inter,sans-serif" }}>
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          style={{ fontSize: 10, fill: "var(--text3)", fontFamily: "Inter,sans-serif" }}>
          total
        </text>
      </svg>

      <div style={{ flex: 1, minWidth: 140 }}>
        {segments.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flex: "none" }} />
            <span style={{ fontSize: 12, color: "var(--text2)", flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{d.value}</span>
            <span style={{ fontSize: 11, color: "var(--text3)", width: 32, textAlign: "right" }}>
              {total > 0 ? `${Math.round(d.value / total * 100)}%` : "0%"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barres verticales (évolution mensuelle) ───────────────
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 130;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: H + 38, paddingTop: 16, position: "relative" }}>
      {/* Lignes de référence */}
      {[0, 0.5, 1].map(frac => (
        <div key={frac} style={{
          position: "absolute", left: 0, right: 0,
          bottom: 28 + frac * H,
          borderTop: "1px dashed var(--g2)", zIndex: 0,
        }} />
      ))}

      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 1 }}>
          {d.value > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text1)" }}>{d.value}</span>
          )}
          <div style={{
            width: "80%",
            height: `${Math.max((d.value / max) * H, d.value > 0 ? 4 : 0)}px`,
            background: "#3B5BDB",
            borderRadius: "4px 4px 0 0",
            opacity: d.value === 0 ? 0.15 : 1,
          }} />
          <span style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline de conversion ────────────────────────────────
function PipelineChart({ steps }) {
  const max = steps[0]?.value || 1;
  const pct = v => max > 0 ? Math.round((v / max) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {steps.map((s, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500 }}>{s.label}</span>
            <span style={{ fontSize: 12 }}>
              <b>{s.value}</b>
              <span style={{ color: "var(--text3)", marginLeft: 4 }}>({pct(s.value)}%)</span>
            </span>
          </div>
          <div style={{ background: "var(--g1)", borderRadius: 6, height: 28, overflow: "hidden", position: "relative" }}>
            <div style={{
              width: `${pct(s.value)}%`,
              height: "100%",
              background: s.color,
              borderRadius: 6,
              transition: "width .5s ease",
              display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
            }}>
              {pct(s.value) > 12 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{pct(s.value)}%</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Barres horizontales (top offres) ─────────────────────
function HBarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);

  if (data.length === 0) return (
    <div style={{ color: "var(--text3)", fontSize: 13, padding: "16px 0" }}>Aucune donnée</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{
              fontSize: 12, color: "var(--text2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              flex: 1, paddingRight: 10,
            }}>
              {d.titre}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, flex: "none" }}>
              {d.count} <span style={{ color: "var(--text3)", fontWeight: 400 }}>cand.</span>
            </span>
          </div>
          <div style={{ background: "var(--g1)", borderRadius: 4, height: 10, overflow: "hidden" }}>
            <div style={{
              width: `${(d.count / max) * 100}%`,
              height: "100%",
              background: BAR_COLORS[i % BAR_COLORS.length],
              borderRadius: 4,
              transition: "width .5s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Composant carte graphique ─────────────────────────────
function ChartCard({ title, children, action }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", color: "var(--text2)" }}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Dashboard RH principal ────────────────────────────────
export default function RHDashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [charts,   setCharts]   = useState(null);
  const [apps,     setApps]     = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookErr,  setBookErr]  = useState("");
  const [hasCal,   setHasCal]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const cal = !!(user?.cal_configured);
    setHasCal(cal);
    Promise.all([
      adminAPI.statistiques(),
      adminAPI.graphiques(),
      applicationsAPI.lister({ statut: "en_attente", page_size: 5 }),
      cal ? calAPI.reservations().catch(e => ({ error: e })) : Promise.resolve(null),
    ]).then(([s, g, a, calRes]) => {
      setStats(s.data);
      setCharts(g.data);
      setApps(a.data.items);
      if (calRes && !calRes.error) {
        setBookings(calRes.data?.reservations || calRes.data?.bookings || []);
      } else if (calRes?.error) {
        setBookErr(calRes.error?.response?.data?.detail || "Impossible de charger Cal.com");
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  // Segments donut
  const donutSegments = Object.entries(STATUT_LABELS).map(([key, label]) => ({
    label,
    value: charts?.repartition_statuts?.[key] ?? 0,
    color: STATUT_COLORS[key],
  }));

  // Pipeline conversion
  const total = stats?.total_candidatures ?? 0;
  const pipelineSteps = [
    { label: "Candidatures reçues", value: total,                              color: "#3B5BDB" },
    { label: "Examinées",           value: charts?.repartition_statuts?.examinee    ?? 0, color: "#F59E0B" },
    { label: "Sélectionnés",        value: charts?.repartition_statuts?.selectionne ?? 0, color: "#8B5CF6" },
    { label: "Embauchés",           value: charts?.repartition_statuts?.embauche    ?? 0, color: "#22C55E" },
  ];

  // Barres mensuelles
  const months6 = getLast6Months();
  const monthlyData = months6.map(m => ({
    label: m.label,
    value: charts?.par_mois?.find(p => p.mois === m.key)?.count ?? 0,
  }));

  // Taux embauche
  const txEmbauche = total > 0 ? Math.round((stats?.embauches ?? 0) / total * 100) : 0;

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord RH</h1>
          <p className="page-subtitle">Vue d'ensemble du recrutement · {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate("/applications")}
        >
          Voir toutes les candidatures →
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-row" style={{ marginBottom: 16 }}>
        <StatCard num={stats?.offres_ouvertes}    label="Offres ouvertes"       color="blue"   />
        <StatCard num={stats?.total_candidatures} label="Candidatures totales"                 />
        <StatCard num={stats?.en_attente}         label="En attente"            color="yellow" />
        <StatCard num={stats?.embauches}          label="Embauchés"             color="green"  sub={`Taux : ${txEmbauche}%`} />
      </div>

      {/* Ligne 1 : Donut + Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <ChartCard title="Répartition des candidatures">
          <DonutChart segments={donutSegments} />
        </ChartCard>

        <ChartCard title="Pipeline de conversion">
          <PipelineChart steps={pipelineSteps} />
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "var(--g1)", borderRadius: 6, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#8B5CF6" }}>{stats?.selectionnes ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>En entretien</div>
            </div>
            <div style={{ flex: 1, background: "var(--g1)", borderRadius: 6, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#EF4444" }}>{stats?.refusees ?? 0}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Refusées</div>
            </div>
            <div style={{ flex: 1, background: "var(--g1)", borderRadius: 6, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#22C55E" }}>{txEmbauche}%</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>Taux embauche</div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Ligne 2 : Évolution mensuelle + Top offres */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <ChartCard title="Évolution des candidatures (6 mois)">
          <BarChart data={monthlyData} />
        </ChartCard>

        <ChartCard
          title="Top offres par candidatures"
          action={
            <button
              onClick={() => navigate("/offers")}
              style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}
            >
              Gérer →
            </button>
          }
        >
          <HBarChart data={charts?.top_offres ?? []} />
        </ChartCard>
      </div>

      {/* Ligne 3 : Candidatures en attente + Cal.com */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Candidatures en attente */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="section-title" style={{ marginBottom: 0, borderBottom: "none" }}>
              Candidatures en attente
            </p>
            <button
              onClick={() => navigate("/applications")}
              style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}
            >
              Voir tout →
            </button>
          </div>
          {apps.length === 0 ? (
            <div className="card" style={{ color: "var(--text2)", fontSize: 13, padding: "18px" }}>
              Aucune candidature en attente.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Candidat</th><th>Offre</th><th>Envoyée le</th><th></th></tr>
                </thead>
                <tbody>
                  {apps.map(a => (
                    <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/applications/${a.id}`)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={a.nom_candidat} role="candidat" size={26} />
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{a.nom_candidat}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--text2)", fontSize: 12 }}>{a.titre_offre}</td>
                      <td style={{ color: "var(--text3)", fontSize: 12 }}>{formatDate(a.postule_le)}</td>
                      <td style={{ color: "var(--blue)", fontSize: 12 }}>→</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cal.com */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p className="section-title" style={{ marginBottom: 0, borderBottom: "none" }}>
              Entretiens Cal.com
            </p>
            {!hasCal && (
              <button
                onClick={() => navigate("/settings")}
                style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}
              >
                Configurer →
              </button>
            )}
          </div>

          {!hasCal ? (
            <div className="card" style={{ textAlign: "center", padding: "28px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Cal.com non configuré</p>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
                Configurez Cal.com pour afficher vos entretiens planifiés ici.
              </p>
              <button onClick={() => navigate("/settings")} className="btn btn-blue btn-sm">
                Configurer
              </button>
            </div>
          ) : bookErr ? (
            <div className="card">
              <p style={{ fontSize: 13, color: "var(--danger)" }}>{bookErr}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="card" style={{ color: "var(--text2)", fontSize: 13, padding: 18 }}>
              Aucun entretien à venir.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Candidat</th><th>Date</th><th>Statut</th><th></th></tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 5).map((b, i) => {
                    const d = b.debut ? new Date(b.debut) : null;
                    return (
                      <tr key={b.id || i}>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{b.candidat_nom || "—"}</td>
                        <td style={{ fontSize: 12, color: "var(--text2)" }}>
                          {d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " " + d.getHours() + "h" + String(d.getMinutes()).padStart(2, "0") : "—"}
                        </td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 20,
                            background: b.status === "ACCEPTED" ? "#EBFBEE" : "#FFF9DB",
                            color:      b.status === "ACCEPTED" ? "#2F9E44" : "#E67700",
                          }}>
                            {b.status === "ACCEPTED" ? "Confirmé" : "En attente"}
                          </span>
                        </td>
                        <td>
                          {b.lien_reunion && (
                            <a href={b.lien_reunion} target="_blank" rel="noreferrer"
                              style={{ fontSize: 12, color: "var(--blue)" }}>
                              Rejoindre
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
