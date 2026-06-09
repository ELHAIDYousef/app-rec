from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):

    # ── Base de données ───────────────────────────────────────
    # Valeurs par défaut = configuration XAMPP standard
    # Remplacer dans .env si votre setup est différent
    DB_HOST:     str 
    DB_PORT:     int 
    DB_USER:     str 
    DB_PASSWORD: str 
    DB_NAME:     str 

    # ── JWT ───────────────────────────────────────────────────
    # SECRET_KEY : OBLIGATOIRE dans .env — aucune valeur par défaut
    # Générer avec : python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY:               str
    ALGORITHM:                str 
    ACCESS_TOKEN_EXPIRE_DAYS: int 

    # ── Fichiers uploadés ─────────────────────────────────────
    UPLOAD_DIR:    str 
    MAX_UPLOAD_MB: int 

    # ── Groq API (scoring IA) ─────────────────────────────────
    # Optionnel — le scoring Groq est désactivé si vide
    # Inscription gratuite : console.groq.com
    GROQ_API_KEY: str 

    # ── Email Gmail SMTP ──────────────────────────────────────
    # Optionnel — les emails sont désactivés si vide
    # Mot de passe d'application Gmail (16 caractères, pas le vrai mdp)
    MAIL_USER:      str 
    MAIL_PASS:      str 
    MAIL_FROM_NAME: str 

    # ── URL de connexion construite automatiquement ───────────
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    model_config = {
        "env_file":  ".env",
        "extra":     "ignore",   # ignore les variables .env inconnues
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
