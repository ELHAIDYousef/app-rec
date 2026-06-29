"""Encadrant — supervision de stagiaires assignés"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.stage import SujetStage, CandidatureStage, Sprint, DailyReport, CahierDesCharges

router = APIRouter(prefix="/api/stage/encadrant", tags=["Stage – Encadrant"])


def _avancement(candidature: CandidatureStage, db: Session) -> dict:
    sprints = db.query(Sprint).filter(Sprint.candidature_id == candidature.id).all()
    total_t = sum(len(s.taches) for s in sprints)
    done_t  = sum(sum(1 for tk in s.taches if tk.statut == "termine") for s in sprints)
    today   = date.today()
    en_retard = any(
        s.date_fin and s.date_fin < today and s.statut != "termine"
        for s in sprints
    )
    return {
        "avancement": round(done_t / total_t * 100) if total_t else 0,
        "total_taches": total_t,
        "taches_terminees": done_t,
        "nb_sprints": len(sprints),
        "en_retard": en_retard,
        "sprints": sprints,
    }


def _get_mes_sujets(user_id: int, db: Session):
    return db.query(SujetStage).filter(SujetStage.encadrant_id == user_id).all()


def _get_mes_candidatures(user_id: int, db: Session):
    sujets = _get_mes_sujets(user_id, db)
    if not sujets:
        return []
    sujet_ids = [s.id for s in sujets]
    return db.query(CandidatureStage).filter(
        CandidatureStage.sujet_id.in_(sujet_ids),
        CandidatureStage.statut == "acceptee",
    ).all()


# ── Dashboard ────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user=Depends(require_role("encadrant"))):
    sujets = _get_mes_sujets(user.id, db)
    cands  = _get_mes_candidatures(user.id, db)

    nb_retards = 0
    stagiaires = []

    for c in cands:
        av = _avancement(c, db)
        if av["en_retard"]:
            nb_retards += 1
        stagiaires.append({
            "candidature_id":  c.id,
            "stagiaire_nom":   c.stagiaire.nom,
            "stagiaire_email": c.stagiaire.email,
            "sujet_titre":     c.sujet.titre if c.sujet else None,
            "avancement":      av["avancement"],
            "en_retard":       av["en_retard"],
        })

    return {
        "nb_stagiaires": len(cands),
        "nb_sujets":     len(sujets),
        "nb_retards":    nb_retards,
        "stagiaires":    stagiaires,
    }


# ── Mes stagiaires ───────────────────────────────────────────

@router.get("/mes-stagiaires")
def mes_stagiaires(db: Session = Depends(get_db), user=Depends(require_role("encadrant"))):
    cands = _get_mes_candidatures(user.id, db)
    result = []
    for c in cands:
        av = _avancement(c, db)
        result.append({
            "candidature_id":  c.id,
            "stagiaire_id":    c.stagiaire_id,
            "stagiaire_nom":   c.stagiaire.nom,
            "stagiaire_email": c.stagiaire.email,
            "sujet_id":        c.sujet_id,
            "sujet_titre":     c.sujet.titre if c.sujet else None,
            "avancement":      av["avancement"],
            "total_taches":    av["total_taches"],
            "taches_terminees":av["taches_terminees"],
            "en_retard":       av["en_retard"],
            "statut":          c.statut,
        })
    return result


# ── Mes sujets ───────────────────────────────────────────────

@router.get("/mes-sujets")
def mes_sujets(db: Session = Depends(get_db), user=Depends(require_role("encadrant"))):
    sujets = _get_mes_sujets(user.id, db)
    result = []
    for s in sujets:
        cand = db.query(CandidatureStage).filter(
            CandidatureStage.sujet_id == s.id,
            CandidatureStage.statut == "acceptee",
        ).first()
        result.append({
            "id":              s.id,
            "titre":           s.titre,
            "description":     s.description,
            "technologies":    s.technologies or [],
            "niveau_requis":   s.niveau_requis,
            "statut":          s.statut,
            "stagiaire_nom":   cand.stagiaire.nom if cand else None,
            "candidature_id":  cand.id if cand else None,
        })
    return result


# ── Détail complet d'un stagiaire ────────────────────────────

@router.get("/stagiaire/{cid}/detail")
def detail_stagiaire(cid: int, db: Session = Depends(get_db), user=Depends(require_role("encadrant"))):
    cand = db.get(CandidatureStage, cid)
    if not cand:
        raise HTTPException(404, "Candidature introuvable")
    if not cand.sujet or cand.sujet.encadrant_id != user.id:
        raise HTTPException(403, "Ce stagiaire ne vous est pas assigné")

    sprints = db.query(Sprint).filter(Sprint.candidature_id == cid).order_by(Sprint.numero).all()
    total_t = sum(len(s.taches) for s in sprints)
    done_t  = sum(sum(1 for tk in s.taches if tk.statut == "termine") for s in sprints)

    sprints_data = []
    for s in sprints:
        sprints_data.append({
            "id":        s.id,
            "numero":    s.numero,
            "titre":     s.titre,
            "objectif":  s.objectif,
            "statut":    s.statut,
            "date_debut": str(s.date_debut) if s.date_debut else None,
            "date_fin":   str(s.date_fin)   if s.date_fin   else None,
            "taches": [{
                "id":          t.id,
                "titre":       t.titre,
                "description": t.description,
                "statut":      t.statut,
                "priorite":    t.priorite,
            } for t in s.taches],
            "reports": sorted([{
                "id":          r.id,
                "date":        str(r.date),
                "realise":     r.realise,
                "difficultes": r.difficultes,
                "prevu":       r.prevu,
            } for r in s.reports], key=lambda r: r["date"], reverse=True)[:5],
        })

    cahier = cand.cahier
    profil = cand.profil

    return {
        "candidature_id":   cid,
        "stagiaire_nom":    cand.stagiaire.nom,
        "stagiaire_email":  cand.stagiaire.email,
        "sujet_titre":      cand.sujet.titre if cand.sujet else None,
        "avancement_global": round(done_t / total_t * 100) if total_t else 0,
        "total_taches":     total_t,
        "taches_terminees": done_t,
        "sprints":          sprints_data,
        "cahier": {
            "id":      cahier.id,
            "statut":  cahier.statut,
            "contenu": cahier.contenu or {},
        } if cahier else None,
        "profil": {
            "niveau_technique":       profil.niveau_technique,
            "competences":            profil.competences or [],
            "technologies_maitrisees":profil.technologies_maitrisees or [],
            "domaine_recommande":     profil.domaine_recommande,
            "score":                  profil.score,
        } if profil else None,
    }
