import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { offresAPI } from "api";
import { Spinner, EmptyState, Button, StatusBadge } from "components/ui";
import { formatDate, getApiError } from "utils/helpers";
import toast from "react-hot-toast";

export default function ManageOffersPage() {
  const navigate          = useNavigate();
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    offresAPI.lister()
      .then(r => setOffers(r.data))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Supprimer l'offre "${title}" ? Toutes les candidatures associées seront aussi supprimées.`))
      return;
    try {
      await offresAPI.supprimer(id);
      toast.success("Offre supprimée");
      load();
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des offres</h1>
          <p className="page-subtitle">{offers.length} offre(s) au total</p>
        </div>
        <Button variant="blue" onClick={() => navigate("/offers/new")}>
          + Nouvelle offre
        </Button>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          title="Aucune offre publiée"
          description="Cliquez sur Nouvelle offre pour commencer à recruter."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Ouverture</th>
                <th>Clôture</th>
                <th>Candidatures</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>{o.titre}</td>
                  <td><StatusBadge status={o.statut} /></td>
                  <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(o.date_debut)}</td>
                  <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(o.date_fin)}</td>
                  <td style={{ fontWeight: 500 }}>{o.nb_candidatures || 0}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" variant="outline"
                        onClick={() => navigate(`/offers/${o.id}/edit`)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="danger"
                        onClick={() => handleDelete(o.id, o.titre)}>
                        Supprimer
                      </Button>
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
