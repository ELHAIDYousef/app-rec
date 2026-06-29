import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routers import auth, offers, applications, notifications, admin, ai
from app.routers import whatsapp as whatsapp_router
from app.routers import cal as cal_router
from app.routers.formation import auth_router, formateur_router, employe_router
from app.routers.stage import (
    candidatures as stage_candidatures,
    sujets as stage_sujets,
    profil as stage_profil,
    affectation as stage_affectation,
    cahier as stage_cahier,
    scrum as stage_scrum,
    avancement as stage_avancement,
    assistant as stage_assistant,
    encadrant_router as stage_encadrant,
)
import app.models.formation  # noqa
import app.models.stage      # noqa


def _poll_emails_loop():
    """Vérifie la boîte Gmail toutes les 2 minutes et répond automatiquement via l'IA."""
    time.sleep(15)  # Attendre que la DB soit prête au démarrage
    while True:
        try:
            from app.core.database import SessionLocal
            from app.routers.stage.assistant import traiter_emails_entrants
            db = SessionLocal()
            try:
                result = traiter_emails_entrants(db)
                print(f"[EMAIL] Polling — traités: {result['traites']}, ignorés: {result['ignores']}")
            finally:
                db.close()
        except Exception as e:
            print(f"[EMAIL] Erreur polling: {e}")
        time.sleep(120)  # Polling toutes les 2 minutes

app = FastAPI(title="3LM Solutions", version="6.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ATS ──────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(offers.router)
app.include_router(applications.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(cal_router.router)
app.include_router(ai.router)
app.include_router(whatsapp_router.router)

# ── Formation ─────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(formateur_router.router)
app.include_router(employe_router.router)

# ── Stage (F8–F15 + Encadrant) ───────────────────────────────
app.include_router(stage_candidatures.router)
app.include_router(stage_sujets.router)
app.include_router(stage_profil.router)
app.include_router(stage_affectation.router)
app.include_router(stage_cahier.router)
app.include_router(stage_scrum.router)
app.include_router(stage_avancement.router)
app.include_router(stage_assistant.router)
app.include_router(stage_encadrant.router)


def _seed_db():
    """Insert one test account per role if the DB has no users yet."""
    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.user import User, Admin, RessourceHumaine, Encadrant, Candidat, Stagiaire

    db = SessionLocal()
    try:
        if db.query(User.id).first():
            return  # already seeded

        pwd = hash_password("test1234")
        accounts = [
            Admin(nom="Admin Test",      email="admin@3lm.ma",
                  mot_de_passe=pwd, role="admin",     departement="Direction Générale"),
            RessourceHumaine(nom="RH Test", email="rh@3lm.ma",
                  mot_de_passe=pwd, role="rh",        departement="Ressources Humaines"),
            Encadrant(nom="Encadrant Test", email="encadrant@3lm.ma",
                  mot_de_passe=pwd, role="encadrant", specialite="Génie Logiciel",
                  departement="Informatique"),
            Candidat(nom="Candidat Test",  email="candidat@3lm.ma",
                  mot_de_passe=pwd, role="candidat"),
            Stagiaire(nom="Stagiaire Test", email="stagiaire@3lm.ma",
                  mot_de_passe=pwd, role="stagiaire", universite="ENSA Marrakech",
                  niveau="master", specialite="Génie Logiciel"),
        ]
        for acc in accounts:
            db.add(acc)
        db.commit()
        print("[SEED] 5 comptes de test créés (mot de passe : test1234)")
        print("[SEED]   admin@3lm.ma / rh@3lm.ma / encadrant@3lm.ma / candidat@3lm.ma / stagiaire@3lm.ma")
    except Exception as e:
        db.rollback()
        print(f"[SEED] Erreur : {e}")
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text(
                    "ALTER TABLE utilisateurs "
                    "MODIFY COLUMN role VARCHAR(20) NOT NULL DEFAULT 'candidat'"
                ))
                conn.commit()
                print("[INFO] Colonne 'role' migrée vers VARCHAR(20)")
            except Exception:
                pass

            try:
                conn.execute(text(
                    "ALTER TABLE sujets_stage ADD COLUMN encadrant_id INT NULL"
                ))
                conn.commit()
                print("[INFO] Colonne 'encadrant_id' ajoutée à sujets_stage")
            except Exception:
                pass

            try:
                conn.execute(text(
                    "ALTER TABLE sujets_stage ADD CONSTRAINT fk_sujets_enc "
                    "FOREIGN KEY (encadrant_id) REFERENCES utilisateurs(id) ON DELETE SET NULL"
                ))
                conn.commit()
                print("[INFO] FK 'fk_sujets_enc' ajoutée à sujets_stage")
            except Exception:
                pass

            try:
                deleted = conn.execute(text(
                    "DELETE FROM utilisateurs WHERE role = '' OR role IS NULL"
                )).rowcount
                if deleted:
                    print(f"[INFO] {deleted} ligne(s) corrompue(s) supprimée(s) (role='')")
                conn.commit()
            except Exception:
                pass
    except Exception as e:
        print(f"[WARNING] DB startup migration skipped: {e}")

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[WARNING] create_all skipped: {e}")

    _seed_db()

    # Lancer le polling email en arrière-plan
    t = threading.Thread(target=_poll_emails_loop, daemon=True)
    t.start()
    print("[EMAIL] Polling automatique démarré (toutes les 2 minutes)")


@app.get("/")
def racine():
    return {"statut": "ok", "app": "3LM Solutions ATS + Formation + Stage"}
