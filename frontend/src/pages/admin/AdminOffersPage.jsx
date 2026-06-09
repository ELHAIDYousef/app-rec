import { useEffect, useState } from "react";
import { offresAPI } from "api";
import { Spinner, EmptyState, StatusBadge } from "components/ui";
import { formatDate } from "utils/helpers";

export default function AdminOffersPage() {
  const [offers,  setOffers]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offresAPI.lister().then(r => setOffers(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Toutes les offres</h1>
          <p className="page-subtitle">Vue admin — lecture seule</p>
        </div>
      </div>

      {offers.length === 0
        ? <EmptyState title="Aucune offre" description="Aucune offre n'a encore ete creee." />
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Statut</th>
                  <th>Cree par</th>
                  <th>Ouverture</th>
                  <th>Cloture</th>
                  <th>Candidatures</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id}>
                    <td>
                      <p style={{ fontWeight: 500 }}>{o.titre}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                        {(o.competences || []).slice(0, 3).map(s => (
                          <span key={s} className="skill-tag" style={{ fontSize: 10, padding: "1px 6px" }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td><StatusBadge status={o.statut} /></td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{o.nom_createur || "—"}</td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(o.date_debut)}</td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(o.date_fin)}</td>
                    <td style={{ fontWeight: 500 }}>{o.nb_candidatures || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
