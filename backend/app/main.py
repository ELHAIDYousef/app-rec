from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routers import auth, offers, applications, notifications, admin, ai
from app.routers import cal as cal_router
from app.routers.formation import auth_router, formateur_router, employe_router
import app.models.formation  # noqa — registers formation tables with Base

app = FastAPI(title="3LM Solutions", version="5.0.0")

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

# ── Formation ─────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(formateur_router.router)
app.include_router(employe_router.router)


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[WARNING] create_all skipped (tables may already exist): {e}")


@app.get("/")
def racine():
    return {"statut": "ok", "app": "3LM Solutions ATS + Formation"}
