"""Helper SMTP / IMAP pour l'assistant IA email automatique"""
import smtplib
import imaplib
import email
import email.utils
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993


def _creds() -> tuple[str, str, str]:
    """Lit les credentials depuis les settings (charge le .env via pydantic-settings)."""
    from app.core.config import get_settings
    s = get_settings()
    return s.MAIL_USER, s.MAIL_PASS, s.MAIL_FROM_NAME


def envoyer_email(to_email: str, subject: str, body: str) -> bool:
    mail_user, mail_pass, mail_from_name = _creds()
    if not mail_user or not mail_pass:
        print("[EMAIL] Identifiants SMTP non configurés")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{mail_from_name} <{mail_user}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(mail_user, mail_pass.replace(" ", ""))
            server.sendmail(mail_user, to_email, msg.as_string())
        print(f"[EMAIL] Envoyé → {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Erreur envoi SMTP: {e}")
        return False


def lire_emails_non_lus() -> list[dict]:
    """Retourne les emails non lus de la boîte Gmail."""
    mail_user, mail_pass, _ = _creds()
    if not mail_user or not mail_pass:
        return []
    result = []
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(mail_user, mail_pass.replace(" ", ""))
        mail.select("INBOX")

        _, uids = mail.search(None, "UNSEEN")
        for uid in (uids[0].split() if uids[0] else []):
            _, data = mail.fetch(uid, "(RFC822)")
            if not data or not data[0]:
                continue
            raw = data[0][1]
            msg = email.message_from_bytes(raw)

            from_name, from_addr = email.utils.parseaddr(msg.get("From", ""))
            subject = msg.get("Subject", "(Sans objet)")
            body    = _extraire_body(msg)

            result.append({
                "uid":     uid,
                "from":    from_addr.lower().strip(),
                "subject": subject,
                "body":    body[:3000],
            })

        mail.logout()
    except Exception as e:
        print(f"[EMAIL] Erreur lecture IMAP: {e}")
    return result


def marquer_lu(uid: bytes):
    mail_user, mail_pass, _ = _creds()
    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
        mail.login(mail_user, mail_pass.replace(" ", ""))
        mail.select("INBOX")
        mail.store(uid, "+FLAGS", "\\Seen")
        mail.logout()
    except Exception as e:
        print(f"[EMAIL] Erreur marquage lu: {e}")


def _extraire_body(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                try:
                    return part.get_payload(decode=True).decode("utf-8", errors="ignore")
                except Exception:
                    pass
    else:
        try:
            return msg.get_payload(decode=True).decode("utf-8", errors="ignore")
        except Exception:
            pass
    return ""
