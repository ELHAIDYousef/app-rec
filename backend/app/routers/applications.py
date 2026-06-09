import os, uuid, logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy import case
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.core.email import email_reception, email_statut_change
from app.core.ats import analyze_cv
from app.models.application import Application, StatutCandidature
from app.models.notification import Notification
from app.models.offer import Offre
from app.models.user import User, RessourceHumaine
from app.schemas.application import CandidatureOut, CandidatureCandidat, StatutUpdate

router   = APIRouter(prefix="/api/candidatures", tags=["Candidatures"])
cfg      = get_settings()
logger   = logging.getLogger(__name__)


def _enrichir(c: Application) -> CandidatureOut:
    out = CandidatureOut.model_validate(c)
    if c.candidat:
        out.nom_candidat        = c.candidat.nom
        out.email_candidat      = c.candidat.email
        out.telephone_candidat  = c.candidat.telephone
    if c.offre:
        out.titre_offre = c.offre.titre
    if c.traite_par_user:
        out.nom_traite_par = c.traite_par_user.nom
    return out


def _enrichir_candidat(c: Application) -> CandidatureCandidat:
    out = CandidatureCandidat.model_validate(c)
    if c.offre:
        out.titre_offre = c.offre.titre
    return out


def _notifier(db, user_id, message, candidature_id):
    db.add(Notification(user_id=user_id, message=message, candidature_id=candidature_id))


def _run_nlp(candidature_id, upload_dir, cv_fichier, motivation, titre, description, competences):
    from app.core.database import SessionLocal
    from sqlalchemy.orm.attributes import flag_modified
    db = SessionLocal()
    try:
        result = analyze_cv(
            upload_dir=upload_dir, cv_filename=cv_fichier,
            motivation=motivation, offer_title=titre,
            offer_desc=description, skills=competences,
        )
        c = db.get(Application, candidature_id)
        if c:
            c.score_nlp   = result.get("ats_score", 0)
            c.analyse_nlp = result
            flag_modified(c, "analyse_nlp")
            db.commit()
            logger.info("NLP score candidature %d : %d/100", candidature_id, c.score_nlp)
    except Exception as e:
        logger.error("NLP échoué candidature %d : %s", candidature_id, e)
    finally:
        db.close()


def _run_groq(candidature_id, upload_dir, cv_fichier, motivation, titre, description, competences):
    from app.core.database import SessionLocal
    from sqlalchemy.orm.attributes import flag_modified
    import httpx, json
    db = SessionLocal()
    try:
        if not cfg.GROQ_API_KEY:
            return

        # Extract CV text from PDF
        cv_text = ""
        if cv_fichier:
            cv_path = os.path.join(upload_dir, cv_fichier)
            if os.path.exists(cv_path):
                try:
                    import fitz
                    doc = fitz.open(cv_path)
                    cv_text = "\n".join(page.get_text() for page in doc)
                    doc.close()
                except Exception:
                    pass

        cv_part   = cv_text[:2000] if cv_text else "(aucun CV fourni)"
        mot_part  = motivation[:500]
        desc_part = description[:300] if description else ""
        skills_str = ", ".join(competences[:10]) if competences else "Non spécifiées"

        prompt = (
            f"Tu es un expert RH senior spécialisé en ATS. "
            f"Analyse la candidature ci-dessous et retourne UNIQUEMENT un objet JSON valide, "
            f"sans markdown, sans texte avant ou après.\n\n"
            f"=== OFFRE ===\n"
            f"Poste : {titre}\n"
            f"Compétences requises : {skills_str}\n"
            f"Description : {desc_part}\n\n"
            f"=== CANDIDATURE ===\n"
            f"CV :\n{cv_part}\n\n"
            f"Lettre de motivation :\n{mot_part}\n\n"
            f"=== INSTRUCTIONS DE SCORING ===\n"
            f"Évalue objectivement. Un candidat sans expérience ni compétences doit avoir un score bas (10-30). "
            f"Un candidat correspondant parfaitement doit avoir un score élevé (75-95). "
            f"Sois précis et différenciant — évite les scores génériques comme 20, 50, ou 70.\n\n"
            f"=== RÉPONSE JSON ATTENDUE ===\n"
            f"Retourne exactement ce format avec des entiers réels basés sur ton analyse :\n"
            f'{{"ats_score": 0, "skills_score": 0, "experience_score": 0, "cover_letter_score": 0, '
            f'"education_score": 0, "keywords_score": 0, '
            f'"matched_skills": [], "missing_skills": [], '
            f'"strengths": [], "weaknesses": [], '
            f'"recommendation": "", "scoring_method": "groq_llm"}}'
        )

        headers = {"Authorization": f"Bearer {cfg.GROQ_API_KEY}", "Content-Type": "application/json"}
        body = {
            "model": "llama-3.3-70b-versatile", "max_tokens": 1000, "temperature": 0.2,
            "messages": [
                {"role": "system", "content": "Tu es un expert ATS. Donne de vrais scores. Réponds uniquement en JSON valide."},
                {"role": "user",   "content": prompt},
            ],
        }

        with httpx.Client(timeout=30) as client:
            resp = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=body)
            if resp.status_code != 200:
                logger.error("Groq erreur %d candidature %d : %s", resp.status_code, candidature_id, resp.text[:300])
            resp.raise_for_status()

        raw = resp.json()["choices"][0]["message"]["content"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        result["ats_score"]      = max(0, min(100, int(result.get("ats_score", 0))))
        result["scoring_method"] = "groq_llm"

        c = db.get(Application, candidature_id)
        if c:
            c.score_groq   = result.get("ats_score", 0)
            c.analyse_groq = result
            flag_modified(c, "analyse_groq")
            db.commit()
            logger.info("Groq score candidature %d : %d/100", candidature_id, c.score_groq)

    except Exception as e:
        logger.warning("Groq échoué candidature %d : %s", candidature_id, e)
    finally:
        db.close()


# ── Routes ────────────────────────────────────────────────

@router.post("", response_model=CandidatureCandidat, status_code=201)
async def postuler(
    background_tasks: BackgroundTasks,
    offre_id:    int                  = Form(...),
    motivation:  str                  = Form(...),
    cv:          Optional[UploadFile] = File(None),
    db:          Session              = Depends(get_db),
    user:        User                 = Depends(require_role("candidat")),
):
    offre = db.get(Offre, offre_id)
    if not offre: raise HTTPException(404, "Offre introuvable")
    if offre.statut != "ouverte": raise HTTPException(400, "Cette offre est fermée")
    if db.query(Application).filter(Application.offre_id == offre_id, Application.user_id == user.id).first():
        raise HTTPException(400, "Vous avez déjà postulé à cette offre")

    cv_fichier = None
    if cv:
        if cv.content_type != "application/pdf": raise HTTPException(400, "Le CV doit être un PDF")
        content = await cv.read()
        if len(content) > cfg.MAX_UPLOAD_MB * 1024 * 1024: raise HTTPException(400, f"CV trop volumineux (max {cfg.MAX_UPLOAD_MB} Mo)")
        os.makedirs(cfg.UPLOAD_DIR, exist_ok=True)
        cv_fichier = f"{uuid.uuid4().hex}_{cv.filename}"
        with open(os.path.join(cfg.UPLOAD_DIR, cv_fichier), "wb") as f: f.write(content)

    c = Application(offre_id=offre_id, user_id=user.id, motivation=motivation.strip(), cv_fichier=cv_fichier)
    db.add(c); db.flush()
    _notifier(db, user.id, f"Votre candidature pour '{offre.titre}' a bien été envoyée.", c.id)
    db.commit(); db.refresh(c)

    background_tasks.add_task(email_reception, user.email, user.nom, offre.titre)
    background_tasks.add_task(_run_nlp, c.id, cfg.UPLOAD_DIR, cv_fichier, motivation.strip(), offre.titre, offre.description, offre.competences or [])
    if cfg.GROQ_API_KEY:
        background_tasks.add_task(_run_groq, c.id, cfg.UPLOAD_DIR, cv_fichier, motivation.strip(), offre.titre, offre.description, offre.competences or [])

    return _enrichir_candidat(c)


@router.get("/mes-candidatures", response_model=List[CandidatureCandidat])
def mes_candidatures(db: Session = Depends(get_db), user: User = Depends(require_role("candidat"))):
    cs = db.query(Application).filter(Application.user_id == user.id).order_by(Application.postule_le.desc()).all()
    return [_enrichir_candidat(c) for c in cs]


@router.get("", response_model=List[CandidatureOut])
def lister_candidatures(
    offre_id: Optional[int]             = Query(None),
    statut:   Optional[StatutCandidature] = Query(None),
    tri:      str                         = Query("date"),
    db:       Session = Depends(get_db),
    user:     User    = Depends(require_role("rh", "admin")),
):
    q = db.query(Application)
    if offre_id: q = q.filter(Application.offre_id == offre_id)
    if statut:   q = q.filter(Application.statut   == statut)
    # RH voit seulement les candidatures des offres qu'il a créées
    if user.role == "rh":
        q = q.join(Offre, Application.offre_id == Offre.id).filter(Offre.cree_par == user.id)
    if tri == "nlp":
        q = q.order_by(case((Application.score_nlp == None, 1), else_=0), Application.score_nlp.desc())
    elif tri == "groq":
        q = q.order_by(case((Application.score_groq == None, 1), else_=0), Application.score_groq.desc())
    else:
        q = q.order_by(Application.postule_le.desc())
    return [_enrichir(c) for c in q.all()]


@router.get("/{c_id}", response_model=CandidatureOut)
def get_candidature(c_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.get(Application, c_id)
    if not c: raise HTTPException(404, "Candidature introuvable")
    if user.role == "candidat" and c.user_id != user.id: raise HTTPException(403, "Accès refusé")
    return _enrichir(c)


@router.post("/{c_id}/relancer-nlp", response_model=CandidatureOut)
def relancer_nlp(c_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), _=Depends(require_role("rh", "admin"))):
    c = db.get(Application, c_id)
    if not c: raise HTTPException(404, "Candidature introuvable")
    c.score_nlp = None; c.analyse_nlp = None; db.commit()
    background_tasks.add_task(_run_nlp, c.id, cfg.UPLOAD_DIR, c.cv_fichier, c.motivation,
                              c.offre.titre if c.offre else "", c.offre.description if c.offre else "",
                              c.offre.competences if c.offre else [])
    db.refresh(c)
    return _enrichir(c)


@router.post("/{c_id}/relancer-groq", response_model=CandidatureOut)
def relancer_groq(c_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), _=Depends(require_role("rh", "admin"))):
    c = db.get(Application, c_id)
    if not c: raise HTTPException(404, "Candidature introuvable")
    c.score_groq = None; c.analyse_groq = None; db.commit()
    background_tasks.add_task(_run_groq, c.id, cfg.UPLOAD_DIR, c.cv_fichier, c.motivation,
                              c.offre.titre if c.offre else "", c.offre.description if c.offre else "",
                              c.offre.competences if c.offre else [])
    db.refresh(c)
    return _enrichir(c)


@router.patch("/{c_id}/statut", response_model=CandidatureOut)
def changer_statut(c_id: int, payload: StatutUpdate, background_tasks: BackgroundTasks,
                   db: Session = Depends(get_db), rh: User = Depends(require_role("rh", "admin"))):
    c = db.get(Application, c_id)
    if not c: raise HTTPException(404, "Candidature introuvable")
    ancien = c.statut
    from datetime import datetime, timezone
    c.statut            = payload.statut
    c.traite_par        = rh.id
    c.statut_modifie_le = datetime.now(timezone.utc)
    if ancien != payload.statut:
        titre = c.offre.titre if c.offre else "une offre"
        candidat = db.get(User, c.user_id)
        if payload.statut == StatutCandidature.selectionne:
            cal_link = rh.cal_link if isinstance(rh, RessourceHumaine) else ""
            msg = f"Vous avez été sélectionné(e) pour '{titre}'."
            if cal_link: msg += f"\nRéservez votre entretien : {cal_link}"
            _notifier(db, c.user_id, msg, c.id)
        else:
            labels = {"examinee": "Examinée", "refusee": "Refusée", "embauche": "Embauché(e)"}
            _notifier(db, c.user_id, f"Statut mis à jour pour '{titre}' : {labels.get(payload.statut.value, payload.statut.value)}.", c.id)
        if candidat:
            cal_link = (rh.cal_link if isinstance(rh, RessourceHumaine) else "") if payload.statut == StatutCandidature.selectionne else ""
            background_tasks.add_task(email_statut_change, candidat.email, candidat.nom, titre, payload.statut.value, cal_link or "")
    db.commit(); db.refresh(c)
    return _enrichir(c)


@router.get("/{c_id}/cv")
def telecharger_cv(c_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.get(Application, c_id)
    if not c: raise HTTPException(404, "Candidature introuvable")
    if user.role == "candidat" and c.user_id != user.id: raise HTTPException(403, "Accès refusé")
    if not c.cv_fichier:
        raise HTTPException(404, "Ce candidat n'a pas joint de CV à sa candidature.")
    path = os.path.join(cfg.UPLOAD_DIR, c.cv_fichier)
    if not os.path.exists(path):
        raise HTTPException(404, "Le fichier CV a été supprimé du serveur. Le candidat devra soumettre une nouvelle candidature.")
    return FileResponse(path, media_type="application/pdf", filename=c.cv_fichier)
