/*
  Composants UI partagés — 3LM Solutions
  Simple, sans icones, sans framework.
*/

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

// ── Bouton ────────────────────────────────────────────────
export function Button({ children, variant = "blue", size, loading = false, style: s = {}, ...props }) {
  const cls = { blue: "btn btn-blue", primary: "btn btn-primary", outline: "btn btn-outline", danger: "btn btn-danger" }[variant] || "btn btn-blue";
  return (
    <button className={`${cls}${size === "sm" ? " btn-sm" : ""}`} disabled={loading || props.disabled} style={s} {...props}>
      {loading ? <Spinner size={14} /> : children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <input className={`field-input${error ? " error" : ""}`} {...props} />
      {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = "520px" }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Statut badge ──────────────────────────────────────────
// Source unique des libelles de statut (utilisee partout dans l'app)
export const STATUS_LABELS = {
  open:     "Ouvert",
  closed:   "Ferme",
  pending:  "En attente",
  reviewed: "Examinee",
  selected: "Selectionne(e)",
  rejected: "Refusee",
  hired:    "Embauche(e)",
};

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}

// ── Role badge ────────────────────────────────────────────
const ROLE_LABELS = { candidate: "Candidat", rh: "RH Manager", admin: "Admin" };
export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{ROLE_LABELS[role] || role}</span>;
}

// ── Avatar avec initiales ─────────────────────────────────
const AVATAR_BG = { candidate: "#2563eb", rh: "#16a34a", admin: "#d97706" };
export function Avatar({ name = "", role = "", size = 32 }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: AVATAR_BG[role] || "#64748b" }}>
      {initials}
    </div>
  );
}

// ── Alertes ───────────────────────────────────────────────
export function ErrorAlert({ message }) {
  return message ? <div className="alert-error">{message}</div> : null;
}
export function SuccessAlert({ message }) {
  return message ? <div className="alert-success">{message}</div> : null;
}

// ── Etat vide ─────────────────────────────────────────────
export function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
    </div>
  );
}

// ── Carte statistique ─────────────────────────────────────
export function StatCard({ num, label, color }) {
  const colors = { blue: "var(--blue)", green: "var(--green)", yellow: "var(--yellow)", red: "var(--red)" };
  return (
    <div className="card">
      <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, marginBottom: 6, color: colors[color] || "var(--text1)" }}>{num}</div>
      <div style={{ fontSize: 13, color: "var(--text2)" }}>{label}</div>
    </div>
  );
}

// ── Barre de score ATS ────────────────────────────────────
export function ScoreBar({ score, label }) {
  if (score == null) return <span style={{ color: "var(--text3)", fontSize: 12 }}>-</span>;
  const color = score >= 70 ? "var(--green)" : score >= 45 ? "var(--yellow)" : "var(--red)";
  return (
    <div style={{ marginBottom: label ? 8 : 0 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginBottom: 3 }}>
          <span>{label}</span>
          <span style={{ fontWeight: 600, color }}>{score}</span>
        </div>
      )}
      <div className="score-bar-bg">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, error, children, ...props }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <select className={`field-input${error ? " error" : ""}`} {...props}>
        {children}
      </select>
      {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────
export function Textarea({ label, error, ...props }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <textarea className={`field-input${error ? " error" : ""}`} {...props} />
      {error && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
