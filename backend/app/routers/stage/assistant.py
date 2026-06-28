"""F9 – Assistant IA multicanal (chat + email + WhatsApp + vocal)"""
import math
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import require_role
from app.core.groq_helper import appeler_groq, appeler_groq_json
from app.models.stage import MessageAssistant, CandidatureStage, ProfilAnalyse
from app.models.user import User

router = APIRouter(prefix="/api/stage/assistant", tags=["Stage – F9 Assistant IA"])

SYSTEM_PROMPT = """Tu es l'assistant IA de la plateforme de gestion des stages de 3LM Solutions.
Tu aides les stagiaires à :
- Comprendre le processus de candidature
- Analyser leur profil et compétences
- Choisir un sujet de stage adapté
- Suivre leur avancement Scrum
- Rédiger leur cahier des charges
- Répondre à leurs questions sur la plateforme

Sois professionnel, bienveillant et constructif. Réponds en français. Sois concis (max 200 mots par réponse)."""


class MessageIn(BaseModel):
    contenu: str
    canal:   Optional[str] = "chat"  # chat / email / whatsapp


def _ser_msg(m: MessageAssistant) -> dict:
    return {
        "id":      m.id,
        "canal":   m.canal,
        "role":    m.role,
        "contenu": m.contenu,
        "cree_le": m.cree_le.isoformat() if m.cree_le else None,
    }


def _get_contexte(user_id: int, db: Session) -> str:
    cand = db.query(CandidatureStage).filter(CandidatureStage.stagiaire_id == user_id).first()
    profil = db.query(ProfilAnalyse).filter(ProfilAnalyse.stagiaire_id == user_id).first()

    ctx = []
    if cand:
        ctx.append(f"Candidature statut: {cand.statut}")
        if cand.sujet:
            ctx.append(f"Sujet affecté: {cand.sujet.titre}")
    if profil:
        ctx.append(f"Profil: niveau {profil.niveau_technique}, domaine {profil.domaine_recommande}")

    return " | ".join(ctx) if ctx else "Nouveau stagiaire"


@router.post("/chat")
def chat(
    payload: MessageIn,
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    historique = db.query(MessageAssistant).filter(
        MessageAssistant.stagiaire_id == user.id,
        MessageAssistant.canal == payload.canal,
    ).order_by(MessageAssistant.cree_le.desc()).limit(8).all()[::-1]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    contexte = _get_contexte(user.id, db)
    messages.append({
        "role": "system",
        "content": f"Contexte stagiaire ({user.nom}): {contexte}",
    })

    for msg in historique:
        messages.append({"role": msg.role, "content": msg.contenu})

    messages.append({"role": "user", "content": payload.contenu})

    reponse = appeler_groq(messages, max_tokens=400, temperature=0.7)

    # Sauvegarder les 2 messages
    for role, contenu in [("user", payload.contenu), ("assistant", reponse)]:
        m = MessageAssistant(
            stagiaire_id = user.id,
            canal        = payload.canal,
            role         = role,
            contenu      = contenu,
        )
        db.add(m)
    db.commit()

    return {"reponse": reponse, "canal": payload.canal}


@router.get("/historique")
def historique(
    canal: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    q = db.query(MessageAssistant).filter(MessageAssistant.stagiaire_id == user.id)
    if canal:
        q = q.filter(MessageAssistant.canal == canal)
    total = q.count()
    items = q.order_by(MessageAssistant.cree_le).offset((page-1)*page_size).limit(page_size).all()
    return {"items": [_ser_msg(m) for m in items], "total": total,
            "page": page, "pages": math.ceil(total/page_size) or 1}


@router.delete("/historique")
def vider_historique(
    canal: Optional[str] = "chat",
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    q = db.query(MessageAssistant).filter(MessageAssistant.stagiaire_id == user.id)
    if canal:
        q = q.filter(MessageAssistant.canal == canal)
    q.delete()
    db.commit()
    return {"message": "Historique effacé"}



# ── Traitement emails entrants ────────────────────────────────

SYSTEM_EMAIL = (
    "Tu es l'assistant IA de 3LM Solutions, spécialisé dans l'accompagnement des stagiaires. "
    "Tu réponds aux emails de manière professionnelle, bienveillante et concise (max 250 mots). "
    "Signe toujours : 'Assistant IA — 3LM Solutions'."
)

SYSTEM_EMAIL_CANDIDAT = (
    "Tu es l'assistant IA de 3LM Solutions, service des ressources humaines. "
    "Tu réponds aux emails des candidats qui ont postulé à des offres d'emploi. "
    "Tu les informes sur le statut de leur candidature, les prochaines étapes du processus de recrutement, "
    "et tu réponds à leurs questions de manière professionnelle, bienveillante et concise (max 250 mots). "
    "Signe toujours : 'Assistant IA — 3LM Solutions RH'."
)


def traiter_emails_entrants(db: Session) -> dict:
    """
    Lit les emails non lus de la boîte Gmail, identifie les candidats et stagiaires
    enregistrés par leur adresse email, génère une réponse IA et l'envoie automatiquement.
    """
    from app.core.email_helper import lire_emails_non_lus, envoyer_email, marquer_lu
    from sqlalchemy import func as sqlfunc
    from app.models.application import Application

    emails = lire_emails_non_lus()
    if not emails:
        return {"traites": 0, "ignores": 0}

    traites = 0
    ignores = 0

    for em in emails:
        try:
            # Recherche insensible à la casse — candidat ou stagiaire
            utilisateur = db.query(User).filter(
                sqlfunc.lower(User.email) == em["from"],
                User.role.in_(["candidat", "stagiaire"]),
            ).first()

            if not utilisateur:
                marquer_lu(em["uid"])
                ignores += 1
                print(f"[EMAIL] Ignoré (non trouvé ou rôle non géré) : {em['from']}")
                continue

            # Construire le contexte selon le rôle
            if utilisateur.role == "stagiaire":
                system_prompt = SYSTEM_EMAIL
                cand   = db.query(CandidatureStage).filter(CandidatureStage.stagiaire_id == utilisateur.id).first()
                profil = db.query(ProfilAnalyse).filter(ProfilAnalyse.stagiaire_id == utilisateur.id).first()
                ctx_parts = [f"Stagiaire : {utilisateur.nom} ({utilisateur.email})"]
                if cand:
                    ctx_parts.append(f"Candidature statut : {cand.statut}")
                    if cand.sujet:
                        ctx_parts.append(f"Sujet affecté : {cand.sujet.titre}")
                if profil:
                    ctx_parts.append(f"Niveau technique : {profil.niveau_technique}")
                    ctx_parts.append(f"Domaine recommandé : {profil.domaine_recommande}")
            else:  # candidat
                system_prompt = SYSTEM_EMAIL_CANDIDAT
                candidatures = db.query(Application).filter(Application.user_id == utilisateur.id).all()
                ctx_parts = [f"Candidat : {utilisateur.nom} ({utilisateur.email})"]
                for c in candidatures:
                    ctx_parts.append(
                        f"Candidature pour '{c.offre.titre}' — statut : {c.statut.value}"
                    )
                if not candidatures:
                    ctx_parts.append("Aucune candidature enregistrée")

            contexte = " | ".join(ctx_parts)

            # Récupérer l'historique email (contexte conversationnel)
            historique = (
                db.query(MessageAssistant)
                .filter(
                    MessageAssistant.stagiaire_id == utilisateur.id,
                    MessageAssistant.canal        == "email",
                )
                .order_by(MessageAssistant.cree_le.desc())
                .limit(6)
                .all()
            )

            messages_groq = [
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": f"Contexte : {contexte}"},
            ]
            for h in reversed(historique):
                messages_groq.append({"role": h.role, "content": h.contenu})
            messages_groq.append({
                "role": "user",
                "content": f"Objet : {em['subject']}\n\n{em['body']}",
            })

            # Appel Groq — httpx synchrone, compatible avec un thread background
            try:
                reponse = appeler_groq(messages_groq, max_tokens=600, temperature=0.6)
            except Exception as groq_err:
                print(f"[EMAIL] Erreur Groq pour {em['from']}: {groq_err}")
                marquer_lu(em["uid"])  # éviter la boucle infinie sur cet email
                ignores += 1
                continue

            sujet_rep = em["subject"] if em["subject"].lower().startswith("re:") \
                        else f"Re: {em['subject']}"
            envoyer_email(em["from"], sujet_rep, reponse)

            db.add(MessageAssistant(
                stagiaire_id=utilisateur.id, canal="email", role="user",
                contenu=f"Objet : {em['subject']}\n\n{em['body']}",
            ))
            db.add(MessageAssistant(
                stagiaire_id=utilisateur.id, canal="email", role="assistant",
                contenu=reponse,
            ))
            db.commit()
            marquer_lu(em["uid"])
            traites += 1
            print(f"[EMAIL] Réponse IA envoyée à {em['from']} (rôle: {utilisateur.role})")

        except Exception as e:
            print(f"[EMAIL] Erreur inattendue pour {em.get('from', '?')}: {e}")
            try:
                marquer_lu(em["uid"])
            except Exception:
                pass
            ignores += 1

    return {"traites": traites, "ignores": ignores}


@router.post("/traiter-emails")
def traiter_emails_manuel(
    db:   Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    """Déclenche manuellement la vérification de la boîte mail et les réponses IA."""
    result = traiter_emails_entrants(db)
    msg = f"{result['traites']} email(s) traité(s), {result['ignores']} ignoré(s) (non stagiaires)."
    return {**result, "message": msg}


@router.get("/statut-email")
def statut_email(user=Depends(require_role("admin", "rh", "stagiaire"))):
    """Vérifie si les credentials email sont configurés."""
    from app.core.config import get_settings
    s = get_settings()
    configured = bool(s.MAIL_USER and s.MAIL_PASS)
    return {
        "configure": configured,
        "adresse":   s.MAIL_USER if configured else None,
        "polling":   "toutes les 2 minutes" if configured else "désactivé",
    }


@router.post("/email-auto/{cid}")
def email_automatique(
    cid: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin", "rh")),
):
    cand = db.get(CandidatureStage, cid)
    if not cand: raise HTTPException(404)

    statut_labels = {
        "en_attente": "reçue et en cours d'examen",
        "acceptee":   "acceptée",
        "refusee":    "refusée",
    }
    label = statut_labels.get(cand.statut, cand.statut)

    prompt = f"""Rédige un email professionnel et chaleureux pour informer le stagiaire {cand.stagiaire.nom} que sa candidature est {label}.

Inclus :
- Formule de politesse
- Confirmation du statut
- Prochaines étapes
- Invitation à contacter si questions

Max 150 mots. Signe au nom de "L'équipe 3LM Solutions"."""

    email_text = appeler_groq([
        {"role": "system", "content": "Tu rédiges des emails professionnels pour un service RH en français."},
        {"role": "user", "content": prompt},
    ], max_tokens=300)

    cand.message_ia = email_text
    db.commit()

    return {"email": email_text, "destinataire": cand.stagiaire.email}


# ── Entretien vocal IA ────────────────────────────────────────

SYSTEM_VOCAL = """Tu es un recruteur IA de 3LM Solutions qui mène un entretien vocal structuré avec un stagiaire.

Ton objectif est de collecter des informations sur :
1. Sa formation académique et niveau d'études
2. Ses compétences techniques (langages, frameworks, outils)
3. Ses projets réalisés et expériences pratiques
4. Ses technologies maîtrisées
5. Ses centres d'intérêt et domaines de passion
6. Le domaine de spécialisation souhaité pour le stage

Règles :
- Pose UNE seule question à la fois, courte et précise
- Adapte la question suivante en fonction de la réponse précédente
- Commence par accueillir chaleureusement le stagiaire et lui demander de se présenter
- Sois encourageant, bienveillant et professionnel
- Réponds en maximum 60 mots
- Parle uniquement en français"""


@router.post("/vocal/transcrire")
async def transcrire_vocal(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    """Reçoit un fichier audio, le transcrit avec Groq Whisper et génère une réponse d'entretien IA."""
    from app.core.config import get_settings
    cfg = get_settings()

    if not cfg.GROQ_API_KEY:
        raise HTTPException(400, "Clé GROQ_API_KEY non configurée")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(400, "Fichier audio vide")

    print(f"[VOCAL] Audio reçu : {len(audio_bytes)} octets, filename={audio.filename}, content_type={audio.content_type}")

    # Transcription avec Groq Whisper (AsyncClient — compatible async def)
    # Essaie whisper-large-v3-turbo d'abord (plus rapide, mêmes limites),
    # puis whisper-large-v3 en fallback
    transcription = None
    for model in ("whisper-large-v3-turbo", "whisper-large-v3"):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {cfg.GROQ_API_KEY}"},
                    files={
                        "file":     ("audio.webm", audio_bytes, "audio/webm"),
                        "model":    (None, model),
                        "language": (None, "fr"),
                    },
                )
                print(f"[VOCAL] Whisper({model}) status={r.status_code} body={r.text[:300]}")
                if r.status_code == 429:
                    print(f"[VOCAL] Rate limit sur {model}, tentative modèle suivant...")
                    continue
                r.raise_for_status()
                transcription = r.json().get("text", "").strip()
                break
        except httpx.HTTPStatusError as e:
            print(f"[VOCAL] Erreur HTTP {e.response.status_code} sur {model}: {e.response.text}")
            continue
        except Exception as e:
            print(f"[VOCAL] Erreur inattendue sur {model}: {e}")
            continue

    if transcription is None:
        raise HTTPException(503, "Service de transcription temporairement indisponible — réessayez dans 30 secondes")

    if not transcription:
        return {"transcription": "", "reponse": "Je n'ai pas bien entendu, pouvez-vous répéter ?"}

    # Récupérer l'historique vocal pour le contexte conversationnel
    historique = (
        db.query(MessageAssistant)
        .filter(
            MessageAssistant.stagiaire_id == user.id,
            MessageAssistant.canal == "vocal",
        )
        .order_by(MessageAssistant.cree_le.desc())
        .limit(10)
        .all()
    )

    messages_groq = [
        {"role": "system", "content": SYSTEM_VOCAL},
        {"role": "system", "content": f"Stagiaire : {user.nom}"},
    ]
    for h in reversed(historique):
        messages_groq.append({"role": h.role, "content": h.contenu})
    messages_groq.append({"role": "user", "content": transcription})

    reponse = appeler_groq(messages_groq, max_tokens=150, temperature=0.7)

    # Sauvegarder l'échange
    db.add(MessageAssistant(stagiaire_id=user.id, canal="vocal", role="user",      contenu=transcription))
    db.add(MessageAssistant(stagiaire_id=user.id, canal="vocal", role="assistant", contenu=reponse))
    db.commit()

    nb_echanges = db.query(MessageAssistant).filter(
        MessageAssistant.stagiaire_id == user.id,
        MessageAssistant.canal == "vocal",
        MessageAssistant.role == "user",
    ).count()

    return {
        "transcription": transcription,
        "reponse":       reponse,
        "nb_echanges":   nb_echanges,
        "pret_analyse":  nb_echanges >= 4,
    }


@router.post("/vocal/analyser-profil")
def analyser_profil_vocal(
    db: Session = Depends(get_db),
    user=Depends(require_role("stagiaire")),
):
    """Extrait le profil complet du stagiaire depuis la conversation vocale et met à jour ProfilAnalyse."""
    historique = (
        db.query(MessageAssistant)
        .filter(
            MessageAssistant.stagiaire_id == user.id,
            MessageAssistant.canal == "vocal",
        )
        .order_by(MessageAssistant.cree_le)
        .all()
    )

    if len(historique) < 6:
        raise HTTPException(400, "Entretien trop court — menez au moins 3 échanges avant l'analyse")

    conversation = "\n".join([
        f"{'Stagiaire' if h.role == 'user' else 'Assistant'}: {h.contenu}"
        for h in historique
    ])

    data = appeler_groq_json([
        {"role": "system", "content": "Tu analyses des entretiens de stage et extrais des profils structurés en JSON."},
        {"role": "user", "content": f"""Analyse cette transcription d'entretien vocal et extrais le profil du stagiaire.

Transcription :
{conversation}

Retourne UNIQUEMENT ce JSON :
{{
  "niveau_technique": "débutant|intermédiaire|avancé",
  "competences": ["compétence1", "compétence2"],
  "technologies_maitrisees": ["tech1", "tech2"],
  "centres_interet": ["intérêt1", "intérêt2"],
  "domaine_recommande": "domaine principal détecté",
  "resume_ia": "résumé en 2-3 phrases du profil du stagiaire"
}}"""},
    ])

    # Mettre à jour ou créer le ProfilAnalyse
    profil = db.query(ProfilAnalyse).filter(ProfilAnalyse.stagiaire_id == user.id).first()
    if not profil:
        profil = ProfilAnalyse(stagiaire_id=user.id)
        db.add(profil)

    profil.niveau_technique        = data.get("niveau_technique")
    profil.competences             = data.get("competences", [])
    profil.technologies_maitrisees = data.get("technologies_maitrisees", [])
    profil.centres_interet         = data.get("centres_interet", [])
    profil.domaine_recommande      = data.get("domaine_recommande")
    profil.resume_ia               = data.get("resume_ia")
    db.commit()

    return {"profil": data, "message": "Profil mis à jour depuis l'entretien vocal"}
