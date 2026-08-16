from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    rating: str
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: UUID
    message_id: UUID
    rating: str
    comment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }