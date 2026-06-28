import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { adminAPI, applicationsAPI, offresAPI } from "api";
import { Spinner, StatusBadge } from "components/ui";
import { formatDate } from "utils/helpers";
import RHDashboardPage    from "pages/rh/RHDashboardPage";
import StagiaireDashboard from "pages/stagiaire/StagiaireDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "candidat")  return <CandidateDashboard />;
  if (user?.role === "rh")        return <RHDashboardPage />;
  if (user?.role === "admin")     return <AdminDashboard />;
  if (user?.role === "stagiaire") return <StagiaireDashboard />;
  return null;
}

function StatCard({ num, label, color }) {
  const colors = { blue: "var(--blue)", green: "var(--success)", yellow: "var(--warning)", red: "var(--danger)" };
  return (
    <div className={`stat-card${color ? " " + color : ""}`}>
      <div className="stat-num" style={{ color: colors[color] || "var(--text1)" }}>{num ?? "—"}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Dashboard Candidat ────────────────────────────────────
function CandidateDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [offers,  setOffers]  = useState([]);
  const [loading, setLoading] = useState(true);

  const [totals, setTotals] = useState({ total: 0, pending: 0, selected: 0, rejected: 0 });

  useEffect(() => {
    Promise.all([
      applicationsAPI.mesCandidatures({ page_size: 100 }),
      offresAPI.lister({ statut: "ouverte", page_size: 4 }),
    ])
      .then(([a, o]) => {
        const items = a.data.items;
        setApps(items);
        setOffers(o.data.items);
        setTotals({
          total:    a.data.total,
          pending:  items.filter(x => x.statut === "en_attente").length,
          selected: items.filter(x => x.statut === "selectionne").length,
          rejected: items.filter(x => x.statut === "refusee").length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const counts = totals;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bonjour, {user?.nom?.split(" ")[0]}</h1>
          <p className="page-subtitle">Voici un apercu de votre activite</p>
        </div>
      </div>

      <div className="stats-row">
        <StatCard num={counts.total}    label="Candidatures envoyees" />
        <StatCard num={counts.pending}  label="En attente"            color="yellow" />
        <StatCard num={counts.selected} label="Selectionne(e)"        color="blue" />
        <StatCard num={counts.rejected} label="Refusees"              color="red" />
      </div>

      <div className="grid-2">
        <div>
          <p className="section-title">Mes dernieres candidatures</p>
          {apps.length === 0
            ? <div className="card" style={{ color: "var(--text2)", fontSize: 13 }}>Aucune candidature pour l'instant.</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {apps.slice(0, 4).map((a) => (
                  <div key={a.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{a.titre_offre}</p>
                      <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{formatDate(a.postule_le)}</p>
                    </div>
                    <StatusBadge status={a.statut} />
                  </div>
                ))}
                {counts.total > 4 && (
                  <button onClick={() => navigate("/my-applications")} style={{ fontSize: 13, color: "var(--blue)", textAlign: "left", padding: "4px 0" }}>
                    Voir toutes ({counts.total}) →
                  </button>
                )}
              </div>
            )
          }
        </div>
        <div>
          <p className="section-title">Offres ouvertes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {offers.slice(0, 4).map(o => (
              <div key={o.id} className="card card-link" onClick={() => navigate("/offers")}>
                <p style={{ fontWeight: 500, fontSize: 14 }}>{o.titre}</p>
                <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>Cloture : {formatDate(o.date_fin)}</p>
              </div>
            ))}
            {offers.length === 0 && (
              <div className="card" style={{ color: "var(--text2)", fontSize: 13 }}>Aucune offre ouverte.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Admin ───────────────────────────────────────
function AdminDashboard() {
  const navigate  = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.statistiques().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const links = [
    { label: "Gestion des utilisateurs",  desc: "Creer et gerer les comptes RH et Admin", path: "/admin/users" },
    { label: "Toutes les offres",          desc: "Vue lecture seule de toutes les offres",  path: "/admin/offers" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-subtitle">Supervision globale de la plateforme</p>
        </div>
      </div>
      <div className="stats-row-3">
        <StatCard num={stats?.total_offres}       label="Offres totales" />
        <StatCard num={stats?.offres_ouvertes}        label="Offres ouvertes"       color="blue" />
        <StatCard num={stats?.total_candidats}   label="Candidats inscrits" />
        <StatCard num={stats?.total_candidatures} label="Candidatures totales" />
        <StatCard num={stats?.en_attente}            label="En attente"            color="yellow" />
        <StatCard num={stats?.embauches}              label="Embauches"             color="green" />
      </div>
      <div className="grid-2">
        {links.map(l => (
          <div key={l.path} className="card card-link" onClick={() => navigate(l.path)}>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 5 }}>{l.label}</p>
            <p style={{ fontSize: 13, color: "var(--text2)" }}>{l.desc} →</p>
          </div>
        ))}
      </div>
    </div>
  );
}
