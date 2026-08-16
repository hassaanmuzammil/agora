# app/schemas/auth.py

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GroupSummary(BaseModel):
    id: UUID
    name: str

    model_config = {
        "from_attributes": True
    }


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    created_at: datetime
    is_admin: bool
    groups: list[GroupSummary] = []

    model_config = {
        "from_attributes": True
    }


class LoginResponse(BaseModel):
    token: str
    expires_at: datetime
    user: UserResponse