from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # auto-reconnect if MySQL drops connection
    pool_recycle=3600,        # recycle connections every hour
    echo=False,               # set True to see SQL queries in console
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── Dependency injected into every route ──────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
