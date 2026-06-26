import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def mes_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.cree_le.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [NotificationOut.model_validate(n).model_dump(mode="json") for n in items],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total > 0 else 1,
        "page_size": page_size,
    }


@router.patch("/{n_id}/lue", response_model=NotificationOut)
def marquer_lue(n_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = db.get(Notification, n_id)
    if not n or n.user_id != user.id:
        from fastapi import HTTPException
        raise HTTPException(404, "Notification introuvable")
    n.lue = True; db.commit(); db.refresh(n)
    return n


@router.post("/tout-lire")
def tout_marquer_lu(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.lue == False).update({"lue": True})
    db.commit()
    return {"message": "Toutes les notifications marquées comme lues"}
