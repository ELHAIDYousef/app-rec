import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import { Avatar, RoleBadge } from "components/ui";

const NAV = {
  candidat: [
    { label: "Tableau de bord",  path: "/dashboard" },
    { label: "Offres d'emploi",  path: "/offers" },
    { label: "Mes candidatures", path: "/my-applications" },
    { label: "Notifications",    path: "/notifications" },
    { label: "Mon profil",       path: "/profile" },
  ],
  rh: [
    { label: "Tableau de bord",  path: "/dashboard" },
    { label: "Offres",           path: "/manage-offers" },
    { label: "Candidatures",     path: "/applications" },
    { label: "Parametres",       path: "/settings" },
    { label: "Mon profil",       path: "/profile" },
  ],
  admin: [
    { label: "Tableau de bord",   path: "/dashboard" },
    { label: "Utilisateurs",      path: "/admin/users" },
    { label: "Toutes les offres", path: "/admin/offers" },
    { label: "Sujets & Stages",   path: "/admin/stages" },
    { label: "Mon profil",        path: "/profile" },
  ],
  stagiaire: [
    { label: "Tableau de bord",   path: "/dashboard" },
    { label: "Ma candidature",    path: "/stage/candidature" },
    { label: "Sujets disponibles",path: "/stage/sujets" },
    { label: "Analyse de profil", path: "/stage/profil" },
    { label: "Assistant IA",      path: "/stage/assistant" },
    { label: "Cahier des charges",path: "/stage/cahier" },
    { label: "Tableau Scrum",     path: "/stage/scrum" },
    { label: "Mon avancement",    path: "/stage/avancement" },
    { label: "Mon profil",        path: "/profile" },
  ],
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = (user && NAV[user.role]) || [];

  return (
    <div className="app-layout">

      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo">3LM <span>Solutions</span></div>
        <div className="topbar-right">
          <div className="topbar-user">
            <Avatar name={user?.nom} role={user?.role} size={28} />
            <span>{user?.nom}</span>
            <RoleBadge role={user?.role} />
          </div>
          <button className="topbar-logout" onClick={() => { logout(); navigate("/login"); }}>
            Deconnexion
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-section">
          <p className="sidebar-label">Navigation</p>
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item${
                location.pathname === item.path ? " active" :
                item.path !== "/dashboard" && location.pathname.startsWith(item.path) ? " active" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main-content">{children}</main>
    </div>
  );
}
