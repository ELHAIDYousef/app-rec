"""F15 – Suivi intelligent de l'avancement"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.core.groq_helper import appeler_groq_json
from app.models.stage import CandidatureStage, Sprint, Tache, DailyReport

router = APIRouter(prefix="/api/stage/avancement", tags=["Stage – F15 Avancement"])


def _get_cand(user_id: int, db: Session):
    c = db.query(CandidatureStage).filter(
        CandidatureStage.stagiaire_id == user_id,
        CandidatureStage.statut == "acceptee",
    ).first()
    if not c: raise HTTPException(404, "Aucun stage actif")
    return c


@router.get("/stats")
def stats(db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    c = _get_cand(user.id, db)
    sprints = db.query(Sprint).filter(Sprint.candidature_id == c.id).all()

    total_taches    = 0
    taches_terminees = 0
    retards         = []
    today           = date.today()

    sprints_data = []
    for s in sprints:
        taches  = s.taches
        total   = len(taches)
        done    = sum(1 for t in taches if t.statut == "termine")
        en_cours = sum(1 for t in taches if t.statut == "en_cours")
        pct     = round(done / total * 100) if total else 0

        total_taches    += total
        taches_terminees += done

        en_retard = False
        if s.date_fin and s.date_fin < today and s.statut != "termine":
            en_retard = True
            retards.append(f"Sprint {s.numero} en retard")

        sprints_data.append({
            "id":        s.id,
            "numero":    s.numero,
            "titre":     s.titre,
            "statut":    s.statut,
            "total":     total,
            "done":      done,
            "en_cours":  en_cours,
            "pct":       pct,
            "en_retard": en_retard,
            "date_debut": str(s.date_debut) if s.date_debut else None,
            "date_fin":   str(s.date_fin)   if s.date_fin   else None,
        })

    avancement_global = round(taches_terminees / total_taches * 100) if total_taches else 0

    reports_7j = db.query(DailyReport).filter(DailyReport.stagiaire_id == user.id).count()
    sprint_actif = next((s for s in sprints if s.statut == "en_cours"), None)

    alertes = []
    if retards:
        alertes += [{"type": "retard", "message": r} for r in retards]

    if sprint_actif:
        nb_reports_sprint = db.query(DailyReport).filter(
            DailyReport.stagiaire_id == user.id,
            DailyReport.sprint_id == sprint_actif.id,
        ).count()
        sprint_days = 0
        if sprint_actif.date_debut:
            sprint_days = (today - sprint_actif.date_debut).days
        if sprint_days > 2 and nb_reports_sprint == 0:
            alertes.append({"type": "absence", "message": "Aucun daily report soumis sur ce sprint"})

    blocked = db.query(Tache).filter(
        Tache.stagiaire_id == user.id,
        Tache.statut == "en_cours",
    ).count()
    if blocked > 3:
        alertes.append({"type": "blocage", "message": f"{blocked} tâches en cours simultanément"})

    return {
        "avancement_global":  avancement_global,
        "total_taches":       total_taches,
        "taches_terminees":   taches_terminees,
        "total_sprints":      len(sprints),
        "sprints_termines":   sum(1 for s in sprints if s.statut == "termine"),
        "sprints":            sprints_data,
        "alertes":            alertes,
        "nb_daily_reports":   reports_7j,
    }


@router.get("/analyse-ia")
def analyse_ia(db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    c = _get_cand(user.id, db)
    sprints = db.query(Sprint).filter(Sprint.candidature_id == c.id).all()
    reports = db.query(DailyReport).filter(DailyReport.stagiaire_id == user.id).order_by(DailyReport.date.desc()).limit(5).all()

    sprints_txt = "\n".join([
        f"- Sprint {s.numero}: {s.titre} | {sum(1 for t in s.taches if t.statut=='termine')}/{len(s.taches)} tâches terminées | Statut: {s.statut}"
        for s in sprints
    ])
    reports_txt = "\n".join([
        f"- {r.date}: Réalisé: {r.realise[:100]}. Difficultés: {r.difficultes or 'aucune'}"
        for r in reports
    ]) or "Aucun daily report"

    prompt = f"""Analyse l'avancement de ce stagiaire et génère un rapport intelligent.

SUJET : {c.sujet.titre if c.sujet else 'Non défini'}

AVANCEMENT PAR SPRINT :
{sprints_txt}

DERNIERS DAILY REPORTS :
{reports_txt}

Retourne ce JSON :
{{
  "synthese": "Analyse globale en 3-4 phrases",
  "taux_avancement": <0-100>,
  "niveau_productivite": "faible|moyen|bon|excellent",
  "risques": ["risque 1", "risque 2"],
  "recommandations": ["recommandation 1", "recommandation 2"],
  "alertes": [
    {{"type": "retard|blocage|absence", "message": "description alerte", "gravite": "info|warning|danger"}}
  ],
  "pronostic": "Le stagiaire devrait terminer dans les délais / avec X jours de retard / etc."
}}"""

    result = appeler_groq_json([
        {"role": "system", "content": "Tu es un expert en suivi de projets Scrum. Analyse objectivement l'avancement. Réponds uniquement en JSON valide."},
        {"role": "user", "content": prompt},
    ], max_tokens=1200)

    return result


@router.get("/admin/{cid}")
def stats_admin(cid: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh", "encadrant"))):
    cand = db.get(CandidatureStage, cid)
    if not cand: raise HTTPException(404)
    if user.role == "encadrant":
        if not cand.sujet or cand.sujet.encadrant_id != user.id:
            raise HTTPException(403, "Ce stagiaire ne vous est pas assigné")
    sprints = db.query(Sprint).filter(Sprint.candidature_id == cid).all()
    total_t = sum(len(s.taches) for s in sprints)
    done_t  = sum(t for s in sprints for t in [sum(1 for tk in s.taches if tk.statut == "termine")])
    return {
        "avancement_global": round(done_t/total_t*100) if total_t else 0,
        "total_taches": total_t,
        "taches_terminees": done_t,
        "nb_sprints": len(sprints),
    }
