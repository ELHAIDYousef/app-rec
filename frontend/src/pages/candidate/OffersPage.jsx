import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { offresAPI, applicationsAPI } from "api";
import { Spinner, StatusBadge, EmptyState, Button } from "components/ui";
import { formatDate } from "utils/helpers";

export default function OffersPage() {
  const navigate = useNavigate();
  const [offers,  setOffers]  = useState([]);
  const [myApps,  setMyApps]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    Promise.all([offresAPI.lister({ statut: "ouverte" }), applicationsAPI.mesCandidatures()])
      .then(([o, a]) => { setOffers(o.data); setMyApps(a.data); })
      .finally(() => setLoading(false));
  }, []);

  const alreadyApplied = id => myApps.some(a => a.offre_id === id);
  const filtered = offers.filter(o => o.titre.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Offres d'emploi</h1>
          <p className="page-subtitle">{filtered.length} offre(s) disponible(s)</p>
        </div>
        <input
          className="field-input"
          placeholder="Rechercher un poste..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240, marginBottom: 0 }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune offre disponible"
          description="Revenez plus tard, de nouvelles offres seront publiées prochainement."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {filtered.map(o => {
            const applied = alreadyApplied(o.id);
            return (
              <div key={o.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{o.titre}</h3>
                  <StatusBadge status={o.statut} />
                </div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, flex: 1 }}>
                  {(o.description || "").slice(0, 110)}{(o.description || "").length > 110 ? "..." : ""}
                </p>
                {(o.competences || []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {o.competences.map(s => <span key={s} className="skill-tag">{s}</span>)}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--gray2)" }}>
                  <p style={{ fontSize: 12, color: "var(--text3)" }}>Clôture : {formatDate(o.date_fin)}</p>
                  <Button
                    size="sm"
                    variant={applied ? "outline" : "blue"}
                    disabled={applied}
                    onClick={() => !applied && navigate(`/apply/${o.id}`)}
                  >
                    {applied ? "Déjà postulé" : "Postuler"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
