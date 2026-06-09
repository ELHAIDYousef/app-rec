import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:8000" });

api.interceptors.request.use(config => {
  const token = localStorage.getItem("tf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Ne pas rediriger si on est deja sur la page de connexion
      const onLoginPage = window.location.pathname === "/login" || window.location.pathname === "/";
      if (!onLoginPage) {
        localStorage.removeItem("tf_token");
        localStorage.removeItem("tf_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  inscription:        data => api.post("/api/auth/inscription", data),
  connexion:          data => api.post("/api/auth/connexion", data),
  me:                 ()   => api.get("/api/auth/moi"),
  modifierProfil:     data => api.patch("/api/auth/moi", data),
  changerMotDePasse:  data => api.post("/api/auth/moi/changer-mot-de-passe", data),
  sauverCal:          data => api.patch("/api/auth/moi/cal", data),
};

export const offresAPI = {
  lister:   params     => api.get("/api/offres", { params }),
  obtenir:  id         => api.get(`/api/offres/${id}`),
  creer:    data       => api.post("/api/offres", data),
  modifier: (id, data) => api.patch(`/api/offres/${id}`, data),
  supprimer:id         => api.delete(`/api/offres/${id}`),
};

export const applicationsAPI = {
  postuler:      formData => api.post("/api/candidatures", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  mesCandidatures: ()     => api.get("/api/candidatures/mes-candidatures"),
  lister:        params   => api.get("/api/candidatures", { params }),
  obtenir:       id       => api.get(`/api/candidatures/${id}`),
  changerStatut: (id, d)  => api.patch(`/api/candidatures/${id}/statut`, d),
  relancerNLP:   id       => api.post(`/api/candidatures/${id}/relancer-nlp`),
  relancerGroq:  id       => api.post(`/api/candidatures/${id}/relancer-groq`),
  telechargerCV: async id => {
    const res  = await api.get(`/api/candidatures/${id}/cv`, { responseType: "blob" });
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href  = url; link.download = `cv_${id}.pdf`;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  ouvrirCV: async id => {
    const res = await api.get(`/api/candidatures/${id}/cv`, { responseType: "blob" });
    window.open(window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })), "_blank");
  },
};

export const notificationsAPI = {
  lister:       ()   => api.get("/api/notifications"),
  marquerLue:   id   => api.patch(`/api/notifications/${id}/lue`),
  toutMarquer:  ()   => api.post("/api/notifications/tout-lire"),
};

export const adminAPI = {
  listerUtilisateurs:     ()  => api.get("/api/admin/utilisateurs"),
  supprimerUtilisateur:   id  => api.delete(`/api/admin/utilisateurs/${id}`),
  creerUtilisateur:   data   => api.post("/api/admin/utilisateurs", data),
  basculerActivation: id     => api.patch(`/api/admin/utilisateurs/${id}/activer`),
  statistiques:       ()     => api.get("/api/admin/statistiques"),
};

export const calAPI = {
  reservations: () => api.get("/api/cal/reservations"),
  test:         () => api.get("/api/cal/test"),
};

export const aiAPI = {
  genererOffre:  data => api.post("/api/ia/generer-description", data),
  analyserGroq:  data => api.post("/api/ia/analyser-cv", data),
};
