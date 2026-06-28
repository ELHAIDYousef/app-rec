import api from "./index";

// ── F8 – Candidatures de stage ────────────────────────────────
export const stageCandidatureAPI = {
  soumettre:     (formData) => api.post("/api/stage/candidatures", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  modifier:      (id, formData) => api.patch(`/api/stage/candidatures/${id}/modifier`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  mes:           (params)   => api.get("/api/stage/candidatures/mes", { params }),
  lister:        (params)   => api.get("/api/stage/candidatures", { params }),
  obtenir:       (id)       => api.get(`/api/stage/candidatures/${id}`),
  changerStatut: (id, data) => api.patch(`/api/stage/candidatures/${id}/statut`, data),
  telechargerCV:  async (id) => {
    const r = await api.get(`/api/stage/candidatures/${id}/cv`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a"); a.href = url; a.download = `cv_stage_${id}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  },
};

// ── F11 – Sujets de stage ─────────────────────────────────────
export const stageSujetAPI = {
  lister:        (params)   => api.get("/api/stage/sujets", { params }),
  creer:         (data)     => api.post("/api/stage/sujets", data),
  modifier:      (id, data) => api.patch(`/api/stage/sujets/${id}`, data),
  changerStatut: (id, data) => api.patch(`/api/stage/sujets/${id}/statut`, data),
  supprimer:     (id)       => api.delete(`/api/stage/sujets/${id}`),
};

// ── F10 – Analyse profil ──────────────────────────────────────
export const stageProfilAPI = {
  analyser:    (data) => api.post("/api/stage/profil/analyser", data),
  monAnalyse:  ()     => api.get("/api/stage/profil/mon-analyse"),
  parStagiaire:(id)   => api.get(`/api/stage/profil/${id}`),
};

// ── F12 – Affectation ────────────────────────────────────────
export const stageAffectationAPI = {
  matcher:       (cid)       => api.post(`/api/stage/affectation/matcher/${cid}`, {}, { timeout: 100000 }),
  affecter:      (cid, data) => api.post(`/api/stage/affectation/affecter/${cid}`, data),
  maProposition: ()          => api.get("/api/stage/affectation/ma-proposition"),
};

// ── F13 – Cahier des charges ──────────────────────────────────

function _download(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const stageCahierAPI = {
  generer:   (cid) => api.post(`/api/stage/cahier/generer/${cid}`, {}, { timeout: 100000 }),
  monCahier: ()    => api.get("/api/stage/cahier/mon-cahier"),
  obtenir:   (id)  => api.get(`/api/stage/cahier/${id}`),
  valider:   (id)  => api.patch(`/api/stage/cahier/${id}/valider`),

  exportMonPdf: async () => {
    const r = await api.get("/api/stage/cahier/mon-cahier/pdf", { responseType: "blob" });
    _download(r.data, "cahier_des_charges.pdf");
  },
  exportMonWord: async () => {
    const r = await api.get("/api/stage/cahier/mon-cahier/word", { responseType: "blob" });
    _download(r.data, "cahier_des_charges.docx");
  },
  exportPdf: async (id, titre) => {
    const r = await api.get(`/api/stage/cahier/${id}/pdf`, { responseType: "blob" });
    _download(r.data, `cahier_${titre || id}.pdf`);
  },
  exportWord: async (id, titre) => {
    const r = await api.get(`/api/stage/cahier/${id}/word`, { responseType: "blob" });
    _download(r.data, `cahier_${titre || id}.docx`);
  },
};

// ── F14 – Scrum ───────────────────────────────────────────────
export const stageScrumAPI = {
  sprints:         ()          => api.get("/api/stage/scrum/sprints"),
  sprintsAdmin:    (cid)       => api.get(`/api/stage/scrum/sprints/admin/${cid}`),
  creerSprint:     (data)      => api.post("/api/stage/scrum/sprints", data),
  changerStatutSprint: (id, d) => api.patch(`/api/stage/scrum/sprints/${id}/statut`, d),
  taches:          (sid)       => api.get(`/api/stage/scrum/sprints/${sid}/taches`),
  creerTache:      (data)      => api.post("/api/stage/scrum/taches", data),
  modifierTache:   (id, data)  => api.patch(`/api/stage/scrum/taches/${id}`, data),
  supprimerTache:  (id)        => api.delete(`/api/stage/scrum/taches/${id}`),
  soumettreReport: (data)      => api.post("/api/stage/scrum/daily-report", data),
  reports:         (params)    => api.get("/api/stage/scrum/daily-reports", { params }),
  genererBacklog:  (cid)       => api.post(`/api/stage/scrum/generer-backlog/${cid}`, {}, { timeout: 120000 }),
};

// ── F15 – Avancement ─────────────────────────────────────────
export const stageAvancementAPI = {
  stats:      ()    => api.get("/api/stage/avancement/stats"),
  analyseIA:  ()    => api.get("/api/stage/avancement/analyse-ia"),
  statsAdmin: (cid) => api.get(`/api/stage/avancement/admin/${cid}`),
};

// ── Encadrant ─────────────────────────────────────────────────
export const stageEncadrantAPI = {
  dashboard:     ()    => api.get("/api/stage/encadrant/dashboard"),
  mesStagiaires: ()    => api.get("/api/stage/encadrant/mes-stagiaires"),
  mesSujets:     ()    => api.get("/api/stage/encadrant/mes-sujets"),
  detail:        (cid) => api.get(`/api/stage/encadrant/stagiaire/${cid}/detail`),
};

// ── F9 – Assistant IA ─────────────────────────────────────────
export const stageAssistantAPI = {
  chat:              (data)      => api.post("/api/stage/assistant/chat", data),
  historique:        (params)    => api.get("/api/stage/assistant/historique", { params }),
  vider:             (canal)     => api.delete(`/api/stage/assistant/historique?canal=${canal}`),
  emailAuto:         (cid)       => api.post(`/api/stage/assistant/email-auto/${cid}`),
  traiterEmails:     ()          => api.post("/api/stage/assistant/traiter-emails"),
  statutEmail:       ()          => api.get("/api/stage/assistant/statut-email"),
  vocalTranscrire:   (formData)  => api.post("/api/stage/assistant/vocal/transcrire", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  }),
  vocalAnalyserProfil: ()        => api.post("/api/stage/assistant/vocal/analyser-profil"),
};
