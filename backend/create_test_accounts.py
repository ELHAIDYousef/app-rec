"""
Create all DB tables + one test account per role.
Run from backend/ :  python create_test_accounts.py
Password for every account: test1234
"""
import sys
import os

# Make sure app/ is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password

# Import ALL models so Base knows every table before create_all
import app.models.user   # noqa
import app.models.stage  # noqa

from app.models.user import User, Admin, RessourceHumaine, Encadrant, Candidat

try:
    from app.models.user import Stagiaire
except ImportError:
    Stagiaire = None

print("Creating tables (if they don't exist yet)…")
Base.metadata.create_all(bind=engine)
print("Tables ready.\n")

PASSWORD = hash_password("test1234")

ACCOUNTS = [
    {
        "email": "admin.test@3lm.ma",
        "role":  "admin",
        "cls":   lambda: Admin(
            nom=         "Admin Test",
            email=       "admin.test@3lm.ma",
            mot_de_passe=PASSWORD,
            role=        "admin",
            departement= "Direction Générale",
        ),
    },
    {
        "email": "rh.test@3lm.ma",
        "role":  "rh",
        "cls":   lambda: RessourceHumaine(
            nom=         "RH Test",
            email=       "rh.test@3lm.ma",
            mot_de_passe=PASSWORD,
            role=        "rh",
            departement= "Ressources Humaines",
        ),
    },
    {
        "email": "encadrant.test@3lm.ma",
        "role":  "encadrant",
        "cls":   lambda: Encadrant(
            nom=         "Encadrant Test",
            email=       "encadrant.test@3lm.ma",
            mot_de_passe=PASSWORD,
            role=        "encadrant",
            specialite=  "Génie Logiciel",
            departement= "Informatique",
        ),
    },
    {
        "email": "candidat.test@gmail.com",
        "role":  "candidat",
        "cls":   lambda: Candidat(
            nom=         "Candidat Test",
            email=       "candidat.test@gmail.com",
            mot_de_passe=PASSWORD,
            role=        "candidat",
        ),
    },
]

if Stagiaire:
    ACCOUNTS.append({
        "email": "stagiaire.test@gmail.com",
        "role":  "stagiaire",
        "cls":   lambda: Stagiaire(
            nom=         "Stagiaire Test",
            email=       "stagiaire.test@gmail.com",
            mot_de_passe=PASSWORD,
            role=        "stagiaire",
            universite=  "ENSA Marrakech",
            niveau=      "master",
            specialite=  "Génie Logiciel",
        ),
    })

db = SessionLocal()

try:
    created = 0
    skipped = 0

    for acc in ACCOUNTS:
        exists = db.query(User.id).filter(User.email == acc["email"]).scalar()
        if exists:
            print(f"  SKIP  [{acc['role']:10}]  {acc['email']}  (already exists)")
            skipped += 1
        else:
            user = acc["cls"]()
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"  OK    [{acc['role']:10}]  {acc['email']}  (id={user.id})")
            created += 1

    print(f"\n  {created} account(s) created, {skipped} skipped.")
    print("  Password for all: test1234")

except Exception as e:
    db.rollback()
    print(f"\n  ERROR: {e}")
    sys.exit(1)
finally:
    db.close()
