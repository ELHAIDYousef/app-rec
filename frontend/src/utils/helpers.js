// helpers.js

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function getApiError(err) {
  const data = err?.response?.data;
  if (!data) return "Une erreur est survenue. Veuillez réessayer.";

  // Pydantic validation error — show simple message
  if (Array.isArray(data.detail)) {
    return "Données invalides. Veuillez vérifier les champs saisis.";
  }

  // Simple string — return as is if already French, else generic
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data === "string") return data;

  return "Une erreur est survenue. Veuillez réessayer.";
}
