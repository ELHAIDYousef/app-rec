import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_role, get_current_user
from app.models.user import User, RessourceHumaine

router = APIRouter(prefix="/api/cal", tags=["Cal.com"])


def _normaliser(bookings_raw):
    out = []
    for b in bookings_raw:
        attendees = b.get("attendees", [])
        candidat  = next((a for a in attendees if a.get("role") != "ORGANIZER"), attendees[0] if attendees else {})
        out.append({
            "id":             b.get("id"),
            "titre":          b.get("title", "Entretien"),
            "debut":          b.get("startTime") or b.get("start"),
            "fin":            b.get("endTime")   or b.get("end"),
            "statut":         b.get("status", "ACCEPTED"),
            "candidat_nom":   candidat.get("name", "—"),
            "candidat_email": candidat.get("email", "—"),
            "lien_reunion":   b.get("meetingUrl") or b.get("location") or b.get("videoCallUrl"),
        })
    return out


@router.get("/reservations")
def get_reservations(current_user: User = Depends(require_role("rh", "admin"))):
    if not isinstance(current_user, RessourceHumaine) or not current_user.cal_api_key:
        raise HTTPException(400, "Clé API Cal.com non configurée. Allez dans Paramètres.")

    with httpx.Client(timeout=15) as client:
        # Essai v2
        try:
            r = client.get("https://api.cal.com/v2/bookings",
                headers={"Authorization": f"Bearer {current_user.cal_api_key}", "cal-api-version": "2024-08-13"},
                params={"status": "upcoming", "take": 50})
            if r.status_code == 200:
                items = r.json().get("data", r.json().get("bookings", []))
                return {"reservations": _normaliser(items), "total": len(items)}
        except Exception:
            pass
        # Fallback v1
        r = client.get("https://api.cal.com/v1/bookings",
            params={"apiKey": current_user.cal_api_key, "status": "upcoming"})
        if r.status_code == 200:
            items = r.json().get("bookings", [])
            return {"reservations": _normaliser(items), "total": len(items)}
        raise HTTPException(502, f"Erreur Cal.com {r.status_code} — vérifiez votre clé API.")


@router.get("/test")
def test_connexion(current_user: User = Depends(require_role("rh", "admin"))):
    if not isinstance(current_user, RessourceHumaine) or not current_user.cal_api_key:
        return {"statut": "non_configure", "message": "Aucune clé API configurée"}
    key = current_user.cal_api_key
    try:
        with httpx.Client(timeout=10) as client:
            # Try Cal.com v2 /me endpoint first
            r = client.get(
                "https://api.cal.com/v2/me",
                headers={"Authorization": f"Bearer {key}", "cal-api-version": "2024-06-14"},
            )
            if r.status_code == 200:
                data  = r.json()
                email = (data.get("data") or data).get("email", "")
                return {"statut": "connecte", "email": email, "message": "Connecté avec succès"}

            # Fallback: v2 /event-types — just checks the key is valid
            r2 = client.get(
                "https://api.cal.com/v2/event-types",
                headers={"Authorization": f"Bearer {key}", "cal-api-version": "2024-06-14"},
            )
            if r2.status_code == 200:
                return {"statut": "connecte", "email": "", "message": "Connecté avec succès"}

            # Fallback: v1 /me (older keys)
            r3 = client.get("https://api.cal.com/v1/me", params={"apiKey": key})
            if r3.status_code == 200:
                email = r3.json().get("user", {}).get("email", "")
                return {"statut": "connecte", "email": email, "message": "Connecté avec succès"}

            return {"statut": "erreur", "message": f"Clé API invalide (code {r.status_code})"}
    except Exception as e:
        return {"statut": "erreur", "message": str(e)}
