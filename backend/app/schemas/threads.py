from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ThreadCreate(BaseModel):
    name: str | None = None


class ThreadUpdate(BaseModel):
    name: str | None = None


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    created_at: datetime
    intermediate_steps: dict | None = None

    model_config = {
        "from_attributes": True
    }


class ThreadResponse(BaseModel):
    id: UUID
    name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }


class ThreadDetailResponse(BaseModel):
    id: UUID
    name: str | None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]
    next_cursor: UUID | None = None