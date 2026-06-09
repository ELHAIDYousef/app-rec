import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { adminAPI, applicationsAPI, offresAPI, calAPI } from "api";
import { Spinner, StatusBadge, Avatar } from "components/ui";
import { formatDate, formatDateTime } from "utils/helpers";

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "candidat") return <CandidateDashboard />;
  if (user?.role === "rh")        return <RHDashboard />;
  if (user?.role === "admin")     return <AdminDashboard />;
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

  useEffect(() => {
    Promise.all([applicationsAPI.mesCandidatures(), offresAPI.lister({ statut: "ouverte" })])
      .then(([a, o]) => { setApps(a.data); setOffers(o.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const counts = {
    total:    apps.length,
    pending:  apps.filter(a => a.statut === "en_attente").length,
    selected: apps.filter(a => a.statut === "selectionne").length,
    rejected: apps.filter(a => a.statut === "refusee").length,
  };

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
                {apps.slice(0, 4).map(a => (
                  <div key={a.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{a.titre_offre}</p>
                      <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{formatDate(a.postule_le)}</p>
                    </div>
                    <StatusBadge status={a.statut} />
                  </div>
                ))}
                {apps.length > 4 && (
                  <button onClick={() => navigate("/my-applications")} style={{ fontSize: 13, color: "var(--blue)", textAlign: "left", padding: "4px 0" }}>
                    Voir toutes ({apps.length}) →
                  </button>
                )}
              </div>
            )
          }
        </div>
        <div>
          <p className="section-title">Offres ouvertes ({offers.length})</p>
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

// ── Dashboard RH ──────────────────────────────────────────
function RHDashboard() {
  const { user }  = useAuth();
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [apps,     setApps]     = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookErr,  setBookErr]  = useState("");
  const [hasCal,   setHasCal]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const hasCal = !!(user?.cal_api_key);
    setHasCal(hasCal);
    Promise.all([
      adminAPI.statistiques(),
      applicationsAPI.lister({ statut: "en_attente" }),
      hasCal ? calAPI.reservations().catch(err => ({ error: err })) : Promise.resolve(null),
    ]).then(([s, a, cal]) => {
      setStats(s.data);
      setApps(a.data);
      if (cal && !cal.error) {
        setBookings(cal.data?.reservations || cal.data?.bookings || []);
      } else if (cal?.error) {
        setBookErr(cal.error?.response?.data?.detail || "Impossible de charger Cal.com");
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord RH</h1>
          <p className="page-subtitle">Vue d'ensemble du recrutement</p>
        </div>
      </div>

      <div className="stats-row">
        <StatCard num={stats?.offres_ouvertes}        label="Offres ouvertes"       color="blue" />
        <StatCard num={stats?.total_candidatures} label="Candidatures totales" />
        <StatCard num={stats?.en_attente}            label="En attente"            color="yellow" />
        <StatCard num={stats?.embauches}              label="Embauches"             color="green" />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Candidatures en attente */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="section-title" style={{ marginBottom: 0, borderBottom: "none" }}>Candidatures en attente</p>
            <button onClick={() => navigate("/applications")} style={{ fontSize: 13, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
              Voir tout →
            </button>
          </div>
          {apps.length === 0
            ? <div className="card" style={{ color: "var(--text2)", fontSize: 13 }}>Aucune candidature en attente.</div>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Candidat</th><th>Offre</th><th>Envoyee le</th><th></th></tr>
                  </thead>
                  <tbody>
                    {apps.slice(0, 5).map(a => (
                      <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/applications/${a.id}`)}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={a.nom_candidat} role="candidat" size={26} />
                            <span style={{ fontWeight: 500, fontSize: 13 }}>{a.nom_candidat}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--text2)", fontSize: 13 }}>{a.titre_offre}</td>
                        <td style={{ color: "var(--text2)", fontSize: 12 }}>{formatDate(a.postule_le)}</td>
                        <td style={{ color: "var(--blue)", fontSize: 12 }}>Voir →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Cal.com — entretiens planifies */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="section-title" style={{ marginBottom: 0, borderBottom: "none" }}>Entretiens Cal.com</p>
            {!hasCal && (
              <button onClick={() => navigate("/settings")} style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
                Configurer →
              </button>
            )}
          </div>

          {!hasCal ? (
            <div className="card" style={{ textAlign: "center", padding: "24px 20px" }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Cal.com non configure</p>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
                Ajoutez votre cle API Cal.com pour afficher les entretiens planifies ici.
              </p>
              <button onClick={() => navigate("/settings")} className="btn btn-blue btn-sm">
                Configurer Cal.com
              </button>
            </div>
          ) : bookErr ? (
            <div className="card">
              <p style={{ fontSize: 13, color: "var(--red)" }}>{bookErr}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="card" style={{ color: "var(--text2)", fontSize: 13 }}>
              Aucun entretien a venir.
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
                            background: b.status === "ACCEPTED" ? "var(--green-lt)" : "var(--yellow-lt)",
                            color: b.status === "ACCEPTED" ? "var(--green)" : "var(--yellow)",
                          }}>
                            {b.status === "ACCEPTED" ? "Confirme" : "En attente"}
                          </span>
                        </td>
                        <td>
                          {b.lien_reunion && (
                            <a href={b.lien_reunion} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--blue)" }}>
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
