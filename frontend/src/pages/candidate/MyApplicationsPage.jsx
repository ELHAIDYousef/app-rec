import { useEffect, useState } from "react";
import { applicationsAPI } from "api";
import { Spinner, StatusBadge, EmptyState } from "components/ui";
import { formatDate } from "utils/helpers";

export default function MyApplicationsPage() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationsAPI.mesCandidatures()
      .then(r => setApps(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes candidatures</h1>
          <p className="page-subtitle">{apps.length} candidature(s)</p>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState title="Aucune candidature" description="Parcourez les offres pour postuler." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {apps.map(a => (
            <div key={a.id} className="card" style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{a.titre_offre}</p>
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>
                  Envoyée le {formatDate(a.postule_le)}
                </p>

              </div>
              <StatusBadge status={a.statut} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
