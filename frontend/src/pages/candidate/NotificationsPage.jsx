import { useEffect, useState } from "react";
import { notificationsAPI } from "api";
import { Spinner, EmptyState, Button } from "components/ui";
import { formatDateTime } from "utils/helpers";

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    notificationsAPI.lister()
      .then(r => setNotifs(r.data))
      .catch(() => setError("Impossible de charger les notifications."))
      .finally(() => setLoading(false));
  }, []);

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
            {unread > 0 ? `${unread} non lue(s)` : "Tout est lu"}
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

                {/* Cal.com button for interview notifications */}
                {n.type === "interview" && '' && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={settings.calendly_link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-blue btn-sm"
                    >
                      Reserver l'entretien sur Cal.com
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
