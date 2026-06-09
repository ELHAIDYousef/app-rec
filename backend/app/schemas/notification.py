from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationOut(BaseModel):
    id:             int
    message:        str
    candidature_id: Optional[int]
    lue:            bool
    cree_le:        Optional[datetime]

    model_config = {"from_attributes": True}
