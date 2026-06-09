import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "context/AuthContext";
import ProtectedRoute from "components/layout/ProtectedRoute";
import AppLayout from "components/layout/AppLayout";

import AppSelector      from "pages/AppSelector";
import FormationApp     from "pages/formation/FormationApp";

import AuthPage            from "pages/auth/AuthPage";
import Dashboard           from "pages/Dashboard";
import OffersPage          from "pages/candidate/OffersPage";
import MyApplicationsPage  from "pages/candidate/MyApplicationsPage";
import ApplyPage           from "pages/candidate/ApplyPage";
import NotificationsPage   from "pages/candidate/NotificationsPage";
import ManageOffersPage    from "pages/rh/ManageOffersPage";
import OfferFormPage       from "pages/rh/OfferFormPage";
import ApplicationsPage    from "pages/rh/ApplicationsPage";
import CandidateDossierPage from "pages/rh/CandidateDossierPage";
import SettingsPage        from "pages/rh/SettingsPage";
import AdminUsersPage      from "pages/admin/AdminUsersPage";
import AdminOffersPage     from "pages/admin/AdminOffersPage";
import CreateUserPage      from "pages/admin/CreateUserPage";
import ProfilePage         from "pages/ProfilePage";

function Layout({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function ATSRoutes() {
  const { loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="spinner"/>
    </div>
  );
  return (
    <Routes>
      <Route path="/login"           element={<AuthPage/>}/>
      <Route path="/dashboard"       element={<Layout roles={["candidat","rh","admin"]}><Dashboard/></Layout>}/>
      <Route path="/offers"          element={<Layout roles={["candidat"]}><OffersPage/></Layout>}/>
      <Route path="/my-applications" element={<Layout roles={["candidat"]}><MyApplicationsPage/></Layout>}/>
      <Route path="/apply/:id"       element={<Layout roles={["candidat"]}><ApplyPage/></Layout>}/>
      <Route path="/notifications"   element={<Layout roles={["candidat"]}><NotificationsPage/></Layout>}/>
      <Route path="/manage-offers"   element={<Layout roles={["rh","admin"]}><ManageOffersPage/></Layout>}/>
      <Route path="/offers/new"      element={<Layout roles={["rh","admin"]}><OfferFormPage/></Layout>}/>
      <Route path="/offers/:id/edit" element={<Layout roles={["rh","admin"]}><OfferFormPage/></Layout>}/>
      <Route path="/applications"    element={<Layout roles={["rh","admin"]}><ApplicationsPage/></Layout>}/>
      <Route path="/applications/:id" element={<Layout roles={["rh","admin"]}><CandidateDossierPage/></Layout>}/>
      <Route path="/settings"        element={<Layout roles={["rh","admin"]}><SettingsPage/></Layout>}/>
      <Route path="/admin/users"     element={<Layout roles={["admin"]}><AdminUsersPage/></Layout>}/>
      <Route path="/admin/users/new" element={<Layout roles={["admin"]}><CreateUserPage/></Layout>}/>
      <Route path="/admin/offers"    element={<Layout roles={["admin"]}><AdminOffersPage/></Layout>}/>
      <Route path="/profile"         element={<Layout roles={["candidat","rh","admin"]}><ProfilePage/></Layout>}/>
      <Route path="*"                element={<Navigate to="/dashboard" replace/>}/>
    </Routes>
  );
}

export default function App() {
  // "selector" | "ats" | "formation"
  const [app, setApp] = useState(() => {
    return localStorage.getItem("active_app") || "selector";
  });

  const select = (choice) => {
    localStorage.setItem("active_app", choice);
    setApp(choice);
  };

  const backToSelector = () => {
    localStorage.removeItem("active_app");
    setApp("selector");
  };

  if (app === "selector") {
    return <AppSelector onSelect={select}/>;
  }

  if (app === "formation") {
    return (
      <>
        <Toaster position="top-right"/>
        <FormationApp onBack={backToSelector}/>
      </>
    );
  }

  // ATS
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right"/>
        {/* Back to selector button */}
        <div style={{ position:"fixed", bottom:20, right:20, zIndex:9999 }}>
          <button onClick={backToSelector}
            style={{ padding:"8px 14px", borderRadius:8, background:"#1a1a2e",
                     color:"#fff", border:"none", cursor:"pointer", fontSize:12,
                     boxShadow:"0 2px 8px #0003" }}>
            ← Accueil
          </button>
        </div>
        <ATSRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
