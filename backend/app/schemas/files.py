from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from backend.app.schemas.auth import GroupSummary


class FileResponse(BaseModel):

    id: UUID
    filename: str
    blob_storage_path: str
    vector_storage_path: str | None
    mime_type: str | None
    size: int | None
    user_id: UUID | None
    groups: list[GroupSummary] = []
    created_at: datetime


    class Config:
        from_attributes = True


class UpdateFileGroupsRequest(BaseModel):
    group_ids: list[UUID]