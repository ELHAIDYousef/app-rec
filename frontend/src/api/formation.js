const BASE = "http://localhost:8000";

const token = () => localStorage.getItem("form_token") || "";

const h = () => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${token()}`,
});

async function req(method, url, body) {
  const opts = { method, headers: h() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + url, opts);
  if (r.status === 401) {
    localStorage.removeItem("form_token");
    localStorage.removeItem("form_user");
    window.dispatchEvent(new Event("form_logout"));
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: "Erreur" }));
    throw new Error(err.detail || "Une erreur est survenue. Veuillez réessayer.");
  }
  return r.status === 204 ? null : r.json();
}

// ── Auth ────────────────────────────────────────────────
export const authAPI = {
  login: (code) => req("POST", "/api/formation/auth/login", { code }),
  moi:   ()     => req("GET",  "/api/formation/auth/moi"),
};

// ── Formateur ────────────────────────────────────────────
export const formateurAPI = {
  employes:           ()    => req("GET",    "/api/formation/formateur/employes"),
  creerEmploye:       (nom) => req("POST",   "/api/formation/formateur/employes",    { nom }),
  basculerEmploye:    (id)  => req("PATCH",  `/api/formation/formateur/employes/${id}/activer`),
  formateurs:         ()    => req("GET",    "/api/formation/formateur/formateurs"),
  creerFormateur:     (nom) => req("POST",   "/api/formation/formateur/formateurs",  { nom }),
  formations:         ()    => req("GET",    "/api/formation/formateur/formations"),
  supprimerFormation: (id)  => req("DELETE", `/api/formation/formateur/formations/${id}`),
  supprimer:          (id)  => req("DELETE", `/api/formation/formateur/employes/${id}`),
  questions:          (id)  => req("GET",    `/api/formation/formateur/formations/${id}/questions`),

  creerFormation: async (titre, contenu, fichier) => {
    const fd = new FormData();
    fd.append("titre", titre);
    if (contenu) fd.append("contenu", contenu);
    if (fichier) fd.append("fichier", fichier);
    const r = await fetch(BASE + "/api/formation/formateur/formations", {
      method:  "POST",
      headers: { Authorization: `Bearer ${token()}` },
      body:    fd,
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.detail); }
    return r.json();
  },
};

// ── Employé ──────────────────────────────────────────────
export const employeAPI = {
  formations: ()          => req("GET",  "/api/formation/employe/formations"),
  questions:  (fid)       => req("GET",  `/api/formation/employe/formations/${fid}/questions`),
  soumettre:  (fid, data) => req("POST", `/api/formation/employe/formations/${fid}/soumettre`, data),
  resultats:  ()          => req("GET",  "/api/formation/employe/resultats"),
  resultat:   (id)        => req("GET",  `/api/formation/employe/resultats/${id}`),
};
