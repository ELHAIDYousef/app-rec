import { useEffect, useState } from "react";
import { applicationsAPI } from "api";
import { Spinner, StatusBadge, EmptyState, Pagination } from "components/ui";
import { formatDate } from "utils/helpers";

export default function MyApplicationsPage() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const PAGE_SIZE = 10;

  const load = (p = 1) =>
    applicationsAPI.mesCandidatures({ page: p, page_size: PAGE_SIZE })
      .then(r => {
        setApps(r.data.items);
        setTotal(r.data.total);
        setPages(r.data.pages);
        setPage(p);
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handlePage = p => { setLoading(true); load(p); };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes candidatures</h1>
          <p className="page-subtitle">{total} candidature(s)</p>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState title="Aucune candidature" description="Parcourez les offres pour postuler." />
      ) : (
        <>
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
          <Pagination page={page} pages={pages} total={total} onChange={handlePage} />
        </>
      )}
    </div>
  );
}
