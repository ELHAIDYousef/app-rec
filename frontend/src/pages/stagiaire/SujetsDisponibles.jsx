import { useState, useEffect } from "react";
import { stageSujetAPI } from "api/stage";
import { Spinner, Pagination } from "components/ui";

const PAGE_SIZE = 8;
const NIVEAU_COLORS = { licence: "#3B82F6", master: "#8B5CF6", ingenieur: "#F59E0B" };

export default function SujetsDisponibles() {
  const [sujets,  setSujets]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);

  useEffect(() => { charger(1); }, []);

  const charger = async p => {
    setLoading(true);
    try {
      const r = await stageSujetAPI.lister({ page: p, page_size: PAGE_SIZE });
      setSujets(r.data.items); setTotal(r.data.total);
      setPage(r.data.page); setPages(r.data.pages);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28}/></div>;

  if (detail) return (
    <div>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 16 }} onClick={() => setDetail(null)}>
        ← Retour à la liste
      </button>
      <div className="card" style={{ maxWidth: 700 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.3 }}>{detail.titre}</h2>
          <span style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: (NIVEAU_COLORS[detail.niveau_requis] || "#6B7280") + "20",
            color: NIVEAU_COLORS[detail.niveau_requis] || "#6B7280",
          }}>
            {detail.niveau_requis || "Tous niveaux"}
          </span>
        </div>

        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 20 }}>
          {detail.description}
        </p>

        {detail.technologies?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", marginBottom: 8 }}>TECHNOLOGIES</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {detail.technologies.map(t => (
                <span key={t} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12,
                  background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {detail.encadrant && (
          <div style={{ borderTop: "1px solid var(--gray2)", paddingTop: 12, marginTop: 12 }}>
            <p style={{ fontSize: 13 }}>
              <span style={{ color: "var(--text3)" }}>Encadrant : </span>
              <strong>{detail.encadrant}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sujets de stage disponibles</h1>
          <p className="page-subtitle">{total} sujet(s) disponible(s)</p>
        </div>
      </div>

      {sujets.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Aucun sujet disponible</p>
          <p className="empty-state-desc">Des sujets seront publiés prochainement</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {sujets.map(s => (
            <div key={s.id} className="card card-link" onClick={() => setDetail(s)}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h3 style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{s.titre}</h3>
                {s.niveau_requis && (
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, flexShrink: 0, marginLeft: 8,
                    background: (NIVEAU_COLORS[s.niveau_requis] || "#6B7280") + "20",
                    color: NIVEAU_COLORS[s.niveau_requis] || "#6B7280",
                  }}>{s.niveau_requis}</span>
                )}
              </div>

              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, WebkitLineClamp: 3,
                display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {s.description}
              </p>

              {s.technologies?.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {s.technologies.slice(0, 4).map(t => (
                    <span key={t} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11,
                      background: "#EFF6FF", color: "#1D4ED8" }}>{t}</span>
                  ))}
                  {s.technologies.length > 4 && (
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>+{s.technologies.length - 4}</span>
                  )}
                </div>
              )}

              {s.encadrant && (
                <p style={{ fontSize: 11, color: "var(--text3)" }}>Encadrant : {s.encadrant}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} total={total} onChange={charger} />
    </div>
  );
}
