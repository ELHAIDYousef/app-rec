import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applicationsAPI, offresAPI } from "api";
import { Spinner, StatusBadge, EmptyState, Button, Avatar } from "components/ui";
import { formatDate } from "utils/helpers";
import toast from "react-hot-toast";

export default function ApplicationsPage() {
  const navigate              = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [offers,  setOffers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [fOffer,  setFOffer]  = useState("");
  const [fStatus, setFStatus] = useState("");
  const [tri,     setTri]     = useState("date");

  const charger = () => {
    const params = { tri };
    if (fOffer)  params.offre_id = fOffer;
    if (fStatus) params.statut   = fStatus;
    return applicationsAPI.lister(params)
      .then(r => setApps(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { offresAPI.lister().then(r => setOffers(r.data)); charger(); }, []);
  useEffect(() => { setLoading(true); charger(); }, [fOffer, fStatus, tri]);

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const scoreColor = s => s >= 70 ? "var(--green)" : s >= 45 ? "var(--yellow)" : "var(--red)";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidatures</h1>
          <p className="page-subtitle">{apps.length} candidature(s)</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select className="field-input" style={{ width: 180, marginBottom: 0 }} value={fOffer} onChange={e => setFOffer(e.target.value)}>
            <option value="">Toutes les offres</option>
            {offers.map(o => <option key={o.id} value={o.id}>{o.titre}</option>)}
          </select>
          <select className="field-input" style={{ width: 150, marginBottom: 0 }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="examinee">Examinée</option>
            <option value="selectionne">Sélectionné(e)</option>
            <option value="refusee">Refusée</option>
            <option value="embauche">Embauché(e)</option>
          </select>
          <select className="field-input" style={{ width: 160, marginBottom: 0 }} value={tri} onChange={e => setTri(e.target.value)}>
            <option value="date">Trier par date</option>
            <option value="nlp">Trier par score NLP</option>
            <option value="groq">Trier par score Groq</option>
          </select>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState title="Aucune candidature" description="Aucune candidature ne correspond aux filtres." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Candidat</th><th>Offre</th>
                <th>Score NLP</th><th>Score Groq</th>
                <th>Statut</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ color: "var(--text3)", fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={a.nom_candidat} role="candidat" size={28} />
                      <div>
                        <p style={{ fontWeight: 500, fontSize: 13 }}>{a.nom_candidat}</p>
                        <p style={{ color: "var(--text3)", fontSize: 11 }}>{a.email_candidat}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text2)" }}>{a.titre_offre}</td>
                  <td>
                    {a.score_nlp != null
                      ? <span style={{ fontWeight: 600, fontSize: 13, color: scoreColor(a.score_nlp) }}>{a.score_nlp}<span style={{ color: "var(--text3)", fontWeight: 400 }}>/100</span></span>
                      : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td>
                    {a.score_groq != null
                      ? <span style={{ fontWeight: 600, fontSize: 13, color: scoreColor(a.score_groq) }}>{a.score_groq}<span style={{ color: "var(--text3)", fontWeight: 400 }}>/100</span></span>
                      : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td><StatusBadge status={a.statut} /></td>
                  <td style={{ fontSize: 12, color: "var(--text3)" }}>{formatDate(a.postule_le)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" variant="blue" onClick={() => navigate(`/applications/${a.id}`)}>Dossier</Button>
                      {a.cv_fichier && (
                        <Button size="sm" variant="outline" onClick={() => applicationsAPI.telechargerCV(a.id)}>CV</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
