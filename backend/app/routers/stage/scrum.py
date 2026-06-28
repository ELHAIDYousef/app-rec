"""F14 – Gestion Agile Scrum"""
import math
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.core.groq_helper import appeler_groq_json
from app.models.stage import CandidatureStage, Sprint, Tache, DailyReport, CahierDesCharges

router = APIRouter(prefix="/api/stage/scrum", tags=["Stage – F14 Scrum"])


# ── Helpers ───────────────────────────────────────────────────

def _get_cand_active(user_id: int, db: Session) -> CandidatureStage:
    c = db.query(CandidatureStage).filter(
        CandidatureStage.stagiaire_id == user_id,
        CandidatureStage.statut == "acceptee",
    ).first()
    if not c: raise HTTPException(400, "Aucun stage actif")
    return c


def _ser_sprint(s: Sprint) -> dict:
    return {
        "id":       s.id,
        "numero":   s.numero,
        "titre":    s.titre,
        "objectif": s.objectif,
        "date_debut": str(s.date_debut) if s.date_debut else None,
        "date_fin":   str(s.date_fin)   if s.date_fin   else None,
        "statut":   s.statut,
        "nb_taches":    len(s.taches),
        "taches_terminees": sum(1 for t in s.taches if t.statut == "termine"),
    }


def _ser_tache(t: Tache) -> dict:
    return {
        "id":          t.id,
        "sprint_id":   t.sprint_id,
        "titre":       t.titre,
        "description": t.description,
        "statut":      t.statut,
        "priorite":    t.priorite,
        "ordre":       t.ordre,
    }


def _ser_report(r: DailyReport) -> dict:
    return {
        "id":          r.id,
        "sprint_id":   r.sprint_id,
        "date":        str(r.date),
        "realise":     r.realise,
        "difficultes": r.difficultes,
        "prevu":       r.prevu,
        "cree_le":     r.cree_le.isoformat() if r.cree_le else None,
    }


# ── Sprints ───────────────────────────────────────────────────

@router.get("/sprints")
def mes_sprints(db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    c = _get_cand_active(user.id, db)
    sprints = db.query(Sprint).filter(Sprint.candidature_id == c.id).order_by(Sprint.numero).all()
    return [_ser_sprint(s) for s in sprints]


@router.get("/sprints/admin/{cid}")
def sprints_admin(cid: int, db: Session = Depends(get_db), user=Depends(require_role("admin", "rh"))):
    c = db.get(CandidatureStage, cid)
    if not c: raise HTTPException(404)
    sprints = db.query(Sprint).filter(Sprint.candidature_id == cid).order_by(Sprint.numero).all()
    return [_ser_sprint(s) for s in sprints]


class SprintIn(BaseModel):
    titre:      str
    objectif:   Optional[str] = None
    date_debut: Optional[str] = None
    date_fin:   Optional[str] = None


@router.post("/sprints", status_code=201)
def creer_sprint(payload: SprintIn, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    if user.role == "stagiaire":
        c = _get_cand_active(user.id, db)
    else:
        raise HTTPException(400, "Utilisez l'endpoint admin")

    nb = db.query(Sprint).filter(Sprint.candidature_id == c.id).count()
    sprint = Sprint(
        candidature_id = c.id,
        numero         = nb + 1,
        titre          = payload.titre,
        objectif       = payload.objectif,
        date_debut     = date.fromisoformat(payload.date_debut) if payload.date_debut else None,
        date_fin       = date.fromisoformat(payload.date_fin)   if payload.date_fin   else None,
    )
    db.add(sprint); db.commit(); db.refresh(sprint)
    return _ser_sprint(sprint)


@router.patch("/sprints/{sid}/statut")
def changer_statut_sprint(sid: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    s = db.get(Sprint, sid)
    if not s: raise HTTPException(404)
    s.statut = payload.get("statut", s.statut)
    db.commit(); db.refresh(s)
    return _ser_sprint(s)


# ── Tâches ────────────────────────────────────────────────────

@router.get("/sprints/{sid}/taches")
def taches_sprint(sid: int, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    taches = db.query(Tache).filter(Tache.sprint_id == sid).order_by(Tache.ordre).all()
    return [_ser_tache(t) for t in taches]


class TacheIn(BaseModel):
    sprint_id:   int
    titre:       str
    description: Optional[str] = None
    priorite:    Optional[int] = 1


@router.post("/taches", status_code=201)
def creer_tache(payload: TacheIn, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    if user.role == "stagiaire":
        c = _get_cand_active(user.id, db)
        sprint = db.get(Sprint, payload.sprint_id)
        if not sprint or sprint.candidature_id != c.id:
            raise HTTPException(403)
        stagiaire_id = user.id
    else:
        sprint = db.get(Sprint, payload.sprint_id)
        if not sprint: raise HTTPException(404)
        stagiaire_id = db.get(CandidatureStage, sprint.candidature_id).stagiaire_id

    ordre = db.query(Tache).filter(Tache.sprint_id == payload.sprint_id).count()
    t = Tache(
        sprint_id    = payload.sprint_id,
        stagiaire_id = stagiaire_id,
        titre        = payload.titre,
        description  = payload.description,
        priorite     = payload.priorite or 1,
        ordre        = ordre,
    )
    db.add(t); db.commit(); db.refresh(t)
    return _ser_tache(t)


@router.patch("/taches/{tid}")
def modifier_tache(tid: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    t = db.get(Tache, tid)
    if not t: raise HTTPException(404)
    for k in ("titre", "description", "statut", "priorite", "ordre"):
        if k in payload:
            setattr(t, k, payload[k])
    db.commit(); db.refresh(t)
    return _ser_tache(t)


@router.delete("/taches/{tid}", status_code=204)
def supprimer_tache(tid: int, db: Session = Depends(get_db), user=Depends(require_role("stagiaire", "admin", "rh"))):
    t = db.get(Tache, tid)
    if not t: raise HTTPException(404)
    db.delete(t); db.commit()


# ── Daily Reports ─────────────────────────────────────────────

class ReportIn(BaseModel):
    sprint_id:   int
    realise:     str
    difficultes: Optional[str] = None
    prevu:       str


@router.post("/daily-report", status_code=201)
def soumettre_report(payload: ReportIn, db: Session = Depends(get_db), user=Depends(require_role("stagiaire"))):
    c = _get_cand_active(user.id, db)
    today = date.today()
    existing = db.query(DailyReport).filter(
        DailyReport.stagiaire_id == user.id,
        DailyReport.sprint_id == payload.sprint_id,
        DailyReport.date == today,
    ).first()
    if existing:
        existing.realise     = payload.realise
        existing.difficultes = payload.difficultes
        existing.prevu       = payload.prevu
        db.commit(); db.refresh(existing)
        return _ser_report(existing)

    r = DailyReport(
        stagiaire_id = user.id,
        sprint_id    = payload.sprint_id,
        date         = today,
        realise      = payload.realise,
        difficultes  = payload.difficultes,
        prevu        = payload.prevu,
    )
    db.add(r); db.commit(); db.refresh(r)
    return _ser_report(r)


@router.get("/daily-reports")
def mes_reports(
    sprint_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire", "admin", "rh")),
):
    if user.role == "stagiaire":
        q = db.query(DailyReport).filter(DailyReport.stagiaire_id == user.id)
    else:
        q = db.query(DailyReport)
    if sprint_id:
        q = q.filter(DailyReport.sprint_id == sprint_id)
    total = q.count()
    items = q.order_by(DailyReport.date.desc()).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [_ser_report(r) for r in items], "total": total,
            "page": page, "pages": math.ceil(total/page_size) or 1}


# ── Génération IA du backlog ──────────────────────────────────

@router.post("/generer-backlog/{cid}")
def generer_backlog(
    cid: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    cand = db.get(CandidatureStage, cid)
    if not cand or not cand.sujet:
        raise HTTPException(400, "Candidature sans sujet affecté")

    cahier = db.query(CahierDesCharges).filter(CahierDesCharges.candidature_id == cid).first()
    s = cand.sujet

    if cahier and cahier.contenu:
        objectifs = cahier.contenu.get("objectifs", [])
        fonc = cahier.contenu.get("perimetre_fonctionnel", [])
        ctx = f"Objectifs: {objectifs}\nFonctionnalités: {fonc}"
    else:
        ctx = f"Sujet: {s.titre}\n{s.description[:400]}"

    prompt = f"""Génère un backlog Scrum complet pour ce projet de stage en 4 sprints de 2 semaines.

CONTEXTE :
{ctx}
Technologies : {s.technologies or []}

Retourne ce JSON :
{{
  "sprints": [
    {{
      "numero": 1,
      "titre": "Sprint 1 – Analyse et Configuration",
      "objectif": "Objectif du sprint",
      "taches": [
        {{"titre": "Titre de la tâche", "description": "Description courte", "priorite": 3}},
        {{"titre": "Titre de la tâche 2", "description": "Description courte", "priorite": 2}}
      ]
    }}
  ]
}}
Génère 4 sprints avec 4-6 tâches chacun. Priorité: 3=haute, 2=moyenne, 1=basse."""

    result = appeler_groq_json([
        {"role": "system", "content": "Tu es Scrum Master expert. Génère des backlogs réalistes. Réponds uniquement en JSON valide."},
        {"role": "user", "content": prompt},
    ], max_tokens=2500)

    today = date.today()
    created_sprints = []

    for i, sp_data in enumerate(result.get("sprints", [])[:4]):
        date_debut = today + timedelta(weeks=i*2)
        date_fin   = date_debut + timedelta(weeks=2)

        sprint = Sprint(
            candidature_id = cid,
            numero         = sp_data.get("numero", i+1),
            titre          = sp_data.get("titre", f"Sprint {i+1}"),
            objectif       = sp_data.get("objectif"),
            date_debut     = date_debut,
            date_fin       = date_fin,
            statut         = "en_cours" if i == 0 else "planifie",
        )
        db.add(sprint); db.flush()

        for j, t_data in enumerate(sp_data.get("taches", [])):
            t = Tache(
                sprint_id    = sprint.id,
                stagiaire_id = cand.stagiaire_id,
                titre        = t_data.get("titre", "Tâche"),
                description  = t_data.get("description"),
                priorite     = t_data.get("priorite", 1),
                ordre        = j,
            )
            db.add(t)

        created_sprints.append(sprint)

    db.commit()
    return {"message": f"{len(created_sprints)} sprints générés avec succès", "sprints": [_ser_sprint(s) for s in created_sprints]}
