"""Webhook WhatsApp via Twilio — réponse automatique par IA (Groq)"""
import re
from fastapi import APIRouter, Depends, Form, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.groq_helper import appeler_groq
from app.models.user import User
from app.models.stage import MessageAssistant, CandidatureStage, ProfilAnalyse
from app.models.application import Application

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])

SYSTEM_WA_STAGIAIRE = (
    "Tu es l'assistant IA de 3LM Solutions, spécialisé dans l'accompagnement des stagiaires. "
    "Tu réponds aux messages WhatsApp de manière professionnelle et concise (max 150 mots). "
    "Signe toujours : 'Assistant IA — 3LM Solutions'."
)

SYSTEM_WA_CANDIDAT = (
    "Tu es l'assistant IA de 3LM Solutions, service RH. "
    "Tu réponds aux messages WhatsApp des candidats sur leur candidature et le processus de recrutement. "
    "Sois concis (max 150 mots), professionnel et bienveillant. "
    "Signe toujours : 'Assistant IA — 3LM Solutions RH'."
)


def _normaliser_tel(numero: str) -> str:
    """Garde uniquement les chiffres pour une comparaison robuste."""
    return re.sub(r"\D", "", numero)


def _twiml(message: str) -> Response:
    # Échapper les caractères XML spéciaux
    safe = message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'
    return Response(content=xml, media_type="text/xml")


@router.post("/webhook")
def webhook_whatsapp(
    From: str = Form(...),
    Body: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    Twilio envoie un POST ici quand un message WhatsApp est reçu.
    On analyse avec Groq et on renvoie la réponse via TwiML.
    """
    numero_norm = _normaliser_tel(From)  # From = "whatsapp:+212600000000"

    # Rechercher l'utilisateur par numéro de téléphone
    utilisateurs = db.query(User).filter(
        User.role.in_(["candidat", "stagiaire"]),
        User.telephone.isnot(None),
    ).all()

    utilisateur = next(
        (u for u in utilisateurs if _normaliser_tel(u.telephone or "") == numero_norm),
        None,
    )

    if not utilisateur:
        print(f"[WHATSAPP] Ignoré (numéro non trouvé) : {From}")
        return _twiml(
            "Bonjour ! Votre numéro n'est pas enregistré sur notre plateforme. "
            "Veuillez vous inscrire sur app-recrutement pour utiliser cet assistant."
        )

    # Construire le contexte selon le rôle
    if utilisateur.role == "stagiaire":
        system_prompt = SYSTEM_WA_STAGIAIRE
        cand   = db.query(CandidatureStage).filter(CandidatureStage.stagiaire_id == utilisateur.id).first()
        profil = db.query(ProfilAnalyse).filter(ProfilAnalyse.stagiaire_id == utilisateur.id).first()
        ctx = [f"Stagiaire : {utilisateur.nom}"]
        if cand:
            ctx.append(f"Candidature : {cand.statut}")
            if cand.sujet:
                ctx.append(f"Sujet : {cand.sujet.titre}")
        if profil:
            ctx.append(f"Niveau : {profil.niveau_technique}")
    else:
        system_prompt = SYSTEM_WA_CANDIDAT
        candidatures = db.query(Application).filter(Application.user_id == utilisateur.id).all()
        ctx = [f"Candidat : {utilisateur.nom}"]
        for c in candidatures:
            ctx.append(f"'{c.offre.titre}' → {c.statut.value}")
        if not candidatures:
            ctx.append("Aucune candidature enregistrée")

    contexte = " | ".join(ctx)

    # Historique des échanges WhatsApp (contexte conversationnel)
    historique = (
        db.query(MessageAssistant)
        .filter(
            MessageAssistant.stagiaire_id == utilisateur.id,
            MessageAssistant.canal == "whatsapp",
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
    messages_groq.append({"role": "user", "content": Body})

    try:
        reponse = appeler_groq(messages_groq, max_tokens=400, temperature=0.6)
    except Exception as e:
        print(f"[WHATSAPP] Erreur Groq : {e}")
        return _twiml("Désolé, l'assistant est temporairement indisponible. Réessayez dans quelques instants.")

    # Sauvegarder l'échange en base
    db.add(MessageAssistant(stagiaire_id=utilisateur.id, canal="whatsapp", role="user",    contenu=Body))
    db.add(MessageAssistant(stagiaire_id=utilisateur.id, canal="whatsapp", role="assistant", contenu=reponse))
    db.commit()

    print(f"[WHATSAPP] Réponse IA envoyée à {From} (rôle: {utilisateur.role})")
    return _twiml(reponse)
