from datetime import datetime, timedelta, timezone
import secrets

import bcrypt

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import User, Session as UserSession
from backend.app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


security = HTTPBearer()

SESSION_EXPIRY_DAYS = 30


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def generate_token() -> str:
    return secrets.token_urlsafe(48)


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            User.email == payload.email,
            User.deleted_at.is_(None),
        )
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        payload.password,
        user.password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = generate_token()

    session = UserSession(
        user_id=user.id,
        token=token,
        expires_at=(
            datetime.now(timezone.utc)
            + timedelta(days=SESSION_EXPIRY_DAYS)
        ),
    )

    db.add(session)

    await db.commit()
    await db.refresh(session)

    return LoginResponse(
        token=session.token,
        expires_at=session.expires_at,
        user=user,
    )


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials

    result = await db.execute(
        select(UserSession).where(
            UserSession.token == token,
            UserSession.revoked_at.is_(None),
        )
    )

    session = result.scalar_one_or_none()

    if session:
        session.revoked_at = datetime.now(timezone.utc)

        await db.commit()

    return {
        "success": True
    }

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:

    token = credentials.credentials

    result = await db.execute(
        select(UserSession).where(
            UserSession.token == token,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(timezone.utc),
        )
    )

    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    result = await db.execute(
        select(User).where(
            User.id == session.user_id,
            User.deleted_at.is_(None),
        )
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    user: User = Depends(get_current_user),
):
    return user
