import { useEffect, useState } from "react";
import { notificationsAPI } from "api";
import { Spinner, EmptyState, Button } from "components/ui";
import { formatDateTime } from "utils/helpers";

export default function NotificationsPage() {
  const [notifs, setNotifs]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    notificationsAPI.lister().then(r => setNotifs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async id => {
    await notificationsAPI.marquerLue(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await notificationsAPI.toutLire();
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifs.filter(n => !n.is_read).length;

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
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
              className={`notif-item ${!n.is_read ? "unread" : ""}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className={`notif-dot ${n.is_read ? "read" : ""}`} />
              <div style={{ flex: 1 }}>
                <p className={`notif-msg ${!n.is_read ? "unread" : ""}`}>
                  {n.message}
                </p>
                <p className="notif-time">{formatDateTime(n.created_at)}</p>

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
