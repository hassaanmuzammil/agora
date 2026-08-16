from datetime import datetime, timezone
from uuid import UUID


from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)


from sqlalchemy import select

from sqlalchemy.ext.asyncio import AsyncSession


from backend.app.db.session import get_db

from backend.app.db.models import (
    User,
    Thread,
    Message,
    Feedback,
)

from backend.app.api.auth import get_current_user

from backend.app.schemas.feedback import (
    FeedbackCreate,
    FeedbackResponse,
)


router = APIRouter(
    prefix="/threads",
    tags=["feedback"],
)


@router.post(
    "/{thread_id}/messages/{message_id}/feedback",
    response_model=FeedbackResponse,
)
async def create_feedback(
    thread_id: UUID,
    message_id: UUID,
    payload: FeedbackCreate,

    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    # Verify thread belongs to user

    result = await db.execute(
        select(Thread)
        .where(
            Thread.id == thread_id,
            Thread.user_id == user.id,
            Thread.deleted_at.is_(None),
        )
    )

    thread = result.scalar_one_or_none()


    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )


    # Verify message belongs to thread

    result = await db.execute(
        select(Message)
        .where(
            Message.id == message_id,
            Message.thread_id == thread.id,
        )
    )

    message = result.scalar_one_or_none()


    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )


    # Validate rating

    if payload.rating not in [
        "like",
        "dislike",
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be like or dislike",
        )


    feedback = Feedback(
        message_id=message.id,
        rating=payload.rating,
        comment=payload.comment,
    )


    db.add(feedback)

    await db.commit()

    await db.refresh(feedback)


    return feedback