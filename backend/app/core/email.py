
import smtplib
import re
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_email(to_email: str, to_name: str, subject: str, html: str) -> bool:
    """Envoie un email HTML. Retourne True si succes, False sinon. Ne plante jamais."""
    from app.core.config import get_settings
    s = get_settings()
    if not s.MAIL_USER or not s.MAIL_PASS:
        logger.info("Email non configure — ignoré pour %s", to_email)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{s.MAIL_FROM_NAME} <{s.MAIL_USER}>"
        msg["To"]      = f"{to_name} <{to_email}>"
        plain = re.sub(r"<[^>]+>", "", html).strip()
        msg.attach(MIMEText(plain, "plain", "utf-8"))
        msg.attach(MIMEText(html,  "html",  "utf-8"))
        with smtplib.SMTP("smtp.gmail.com", 587) as srv:
            srv.starttls()
            srv.login(s.MAIL_USER, s.MAIL_PASS)
            srv.sendmail(s.MAIL_USER, to_email, msg.as_string())
        logger.info("Email envoye a %s", to_email)
        return True
    except Exception as e:
        logger.error("Echec email vers %s : %s", to_email, e)
        return False


def _wrap(body: str) -> str:
    """Template HTML minimaliste commun a tous les emails."""
    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body{{font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0}}
  .box{{max-width:540px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden}}
  .head{{background:#1a56db;padding:20px 28px}}
  .head h1{{color:#fff;margin:0;font-size:20px;font-weight:600}}
  .head p{{color:#bfdbfe;margin:4px 0 0;font-size:12px}}
  .body{{padding:24px 28px;color:#1e293b;font-size:14px;line-height:1.7}}
  .info{{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin:14px 0}}
  .info.green{{background:#f0fdf4;border-color:#bbf7d0}}
  .info.yellow{{background:#fffbeb;border-color:#fde68a}}
  .info.red{{background:#fef2f2;border-color:#fecaca}}
  .btn{{display:inline-block;background:#1a56db;color:#fff;padding:11px 22px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;margin:14px 0}}
  .foot{{background:#f8fafc;padding:14px 28px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0}}
</style></head><body>
<div class="box">
  <div class="head"><h1>3LM Solutions</h1><p>Systeme de gestion des candidatures</p></div>
  <div class="body">{body}</div>
  <div class="foot">Vous recevez cet email car vous etes inscrit sur 3LM Solutions.</div>
</div></body></html>"""


# ── Contenu par statut ────────────────────────────────────

_STATUTS = {
    "examinee": {
        "sujet":  "Votre candidature est en cours d'examen",
        "titre":  "Candidature examinee",
        "msg":    "Notre equipe RH examine votre dossier. Nous vous tiendrons informe.",
        "classe": "yellow",
    },
    "selectionne": {
        "sujet":  "Vous etes selectionne(e) !",
        "titre":  "Selectionne(e) pour un entretien",
        "msg":    "Felicitations ! Votre profil a retenu notre attention.",
        "classe": "green",
    },
    "refusee": {
        "sujet":  "Suite de votre candidature",
        "titre":  "Candidature non retenue",
        "msg":    "Apres examen, votre candidature n'a pas ete retenue pour ce poste. Nous vous encourageons a postuler a d'autres offres.",
        "classe": "red",
    },
    "embauche": {
        "sujet":  "Bienvenue dans l'equipe !",
        "titre":  "Vous etes embauche(e) !",
        "msg":    "Toutes nos felicitations ! Vous avez ete retenu(e) pour ce poste.",
        "classe": "green",
    },
}


def email_reception(to_email: str, to_name: str, offer_title: str) -> bool:
    """Email de confirmation apres soumission d'une candidature."""
    body = f"""<p>Bonjour <strong>{to_name}</strong>,</p>
<p>Votre candidature a bien ete recue.</p>
<div class="info"><strong>Poste :</strong> {offer_title}<br><strong>Statut :</strong> En attente d'examen</div>
<p>Notre equipe RH examinera votre dossier et vous informera par email.</p>"""
    return send_email(to_email, to_name, f"Candidature recue — {offer_title}", _wrap(body))


def email_statut_change(to_email: str, to_name: str, offer_title: str,
                          new_status: str, calendly_link: str = "") -> bool:
    """Email envoye a chaque changement de statut."""
    info = _STATUTS.get(new_status)
    if not info:
        return False   # pas d'email pour les statuts inconnus

    cal_block = ""
    if new_status == "selectionne" and calendly_link:
        cal_block = f'<p>Reservez votre creneau d\'entretien :</p><a href="{calendly_link}" class="btn">Reserver sur Cal.com</a>'

    body = f"""<p>Bonjour <strong>{to_name}</strong>,</p>
<p>Mise a jour de votre candidature :</p>
<div class="info {info['classe']}">
  <strong>Poste :</strong> {offer_title}<br>
  <strong>Statut :</strong> {info['titre']}<br><br>{info['msg']}
</div>{cal_block}
<p>Connectez-vous sur 3LM Solutions pour plus de details.</p>"""
    return send_email(to_email, to_name, f"{info['sujet']} — {offer_title}", _wrap(body))

# Aliases
email_application_received = email_reception
email_status_changed = email_statut_change
