import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "api";
import { Spinner, Button, Avatar, RoleBadge } from "components/ui";
import { formatDate, getApiError } from "utils/helpers";
import { useAuth } from "context/AuthContext";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const { user: moi }          = useAuth();
  const navigate               = useNavigate();
  const [users,   setUsers]    = useState([]);
  const [loading, setLoading]  = useState(true);

  const charger = () => adminAPI.listerUtilisateurs().then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { charger(); }, []);

  const basculer = async id => {
    try { await adminAPI.basculerActivation(id); toast.success("Statut mis à jour"); charger(); }
    catch (err) { toast.error(getApiError(err)); }
  };


  const supprimerUser = async id => {
    if (!window.confirm("Confirmer la suppression de ce compte ?")) return;
    try { await adminAPI.supprimerUtilisateur(id); toast.success("Compte supprimé"); charger(); }
    catch (err) { toast.error(getApiError(err)); }
  };

  if (loading) return <div className="loading-page"><Spinner size={28} /></div>;

  const staff      = users.filter(u => u.role === "rh" || u.role === "admin");
  const candidats  = users.filter(u => u.role === "candidat");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="page-subtitle">{users.length} compte(s) au total</p>
        </div>
        <Button variant="blue" onClick={() => navigate("/admin/users/new")}>
          + Nouveau compte
        </Button>
      </div>

      <p className="section-title">Admins et RH Managers ({staff.length})</p>
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Département</th><th>Créé le</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {staff.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={u.nom} role={u.role} size={28} />
                    <span style={{ fontWeight: 500 }}>{u.nom}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.email}</td>
                <td><RoleBadge role={u.role} /></td>
                <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.departement || <span style={{ color: "var(--text3)" }}>—</span>}</td>
                <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(u.cree_le)}</td>
                <td>
                  <span style={{ fontSize: 13, fontWeight: 500, color: u.is_active ? "var(--green)" : "var(--red)" }}>
                    {u.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td>
                  {u.id === moi?.id
                    ? <span style={{ fontSize: 12, color: "var(--text3)" }}>Vous</span>
                    : <div style={{display:'flex',gap:6}}>
                        <Button size="sm" variant={u.is_active ? "danger" : "outline"} onClick={() => basculer(u.id)}>
                          {u.is_active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => supprimerUser(u.id)}>Supprimer</Button>
                      </div>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="section-title">Candidats inscrits ({candidats.length})</p>
      {candidats.length === 0
        ? <p style={{ fontSize: 13, color: "var(--text3)" }}>Aucun candidat inscrit.</p>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Inscrit le</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {candidats.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.nom}</td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.email}</td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{u.telephone || "—"}</td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{formatDate(u.cree_le)}</td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 500, color: u.is_active ? "var(--green)" : "var(--red)" }}>
                        {u.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6}}>
                        <Button size="sm" variant={u.is_active ? "danger" : "outline"} onClick={() => basculer(u.id)}>
                          {u.is_active ? "Désactiver" : "Activer"}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => supprimerUser(u.id)}>Supprimer</Button>
                      </div>
                    </td>
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
