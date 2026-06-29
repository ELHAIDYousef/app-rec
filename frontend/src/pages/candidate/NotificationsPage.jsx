import { useEffect, useState } from "react";
import { notificationsAPI } from "api";
import { Spinner, EmptyState, Button, Pagination } from "components/ui";
import { formatDateTime } from "utils/helpers";

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const PAGE_SIZE = 15;

  const load = (p = 1) =>
    notificationsAPI.lister({ page: p, page_size: PAGE_SIZE })
      .then(r => {
        setNotifs(r.data.items);
        setTotal(r.data.total);
        setPages(r.data.pages);
        setPage(p);
      })
      .catch(() => setError("Impossible de charger les notifications."))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handlePage = p => { setLoading(true); load(p); };

  const markRead = async id => {
    try {
      await notificationsAPI.marquerLue(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
    } catch {
      setError("Impossible de marquer la notification comme lue.");
    }
  };

  const markAll = async () => {
    try {
      await notificationsAPI.toutMarquer();
      setNotifs(prev => prev.map(n => ({ ...n, lue: true })));
    } catch {
      setError("Impossible de marquer toutes les notifications comme lues.");
    }
  };

  const unread = notifs.filter(n => !n.lue).length;

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      {error && <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total} notification(s)${unread > 0 ? ` · ${unread} non lue(s)` : ""}` : "Tout est lu"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifs.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous serez notifie ici et par email des que votre candidature evolue."
        />
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
            {notifs.map(n => (
              <div
                key={n.id}
                className={`notif-item ${!n.lue ? "unread" : ""}`}
                onClick={() => !n.lue && markRead(n.id)}
              >
                <div className={`notif-dot ${n.lue ? "read" : ""}`} />
                <div style={{ flex: 1 }}>
                  <p className={`notif-msg ${!n.lue ? "unread" : ""}`}>
                    {n.message}
                  </p>
                  <p className="notif-time">{formatDateTime(n.cree_le)}</p>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pages={pages} total={total} onChange={handlePage} />
        </>
      )}
    </div>
  );
}
