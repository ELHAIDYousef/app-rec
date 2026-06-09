export default function AppSelector({ onSelect }) {
  return (
    <div className="selector-page">
      <div className="selector-wrap">

        <div className="selector-header">
          <h1 className="selector-logo">3LM Solutions</h1>
          <p className="selector-sub">Bienvenue — choisissez votre espace</p>
        </div>

        <div className="selector-cards">
          <div className="selector-card" onClick={() => onSelect("ats")}>
            <div className="selector-icon selector-icon-blue">
              <span>ATS</span>
            </div>
            <h2 className="selector-card-title">Espace Recrutement</h2>
            <p className="selector-card-desc">
              Gérez vos offres d'emploi, candidatures et entretiens.
            </p>
            <div className="selector-btn selector-btn-blue">Accéder</div>
          </div>

          <div className="selector-card" onClick={() => onSelect("formation")}>
            <div className="selector-icon selector-icon-green">
              <span>AF</span>
            </div>
            <h2 className="selector-card-title">Espace Formation</h2>
            <p className="selector-card-desc">
              Créez vos formations et suivez la progression de vos équipes.
            </p>
            <div className="selector-btn selector-btn-green">Accéder</div>
          </div>
        </div>

        <p className="selector-footer">
          3LM Solutions — Projet de Fin d'Études 2026
        </p>
      </div>
    </div>
  );
}
