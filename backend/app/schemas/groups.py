from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
