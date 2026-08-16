import json
from datetime import datetime, timezone
from uuid import UUID

import anyio

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from fastapi.responses import StreamingResponse


from sqlalchemy import select, or_

from sqlalchemy.ext.asyncio import AsyncSession


from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.db.models import (
    Thread,
    Message,
    User,
    File as FileModel,
    file_groups,
)

from backend.app.api.auth import get_current_user

from backend.app.schemas.threads import (
    ThreadCreate,
    ThreadUpdate,
    ThreadResponse,
    ThreadDetailResponse,
    MessageCreate,
)

from backend.app.rag.builder import pipeline
from backend.app.rag.llm import openai_client, query_rewrite, build_context
from backend.app.rag.prompts import FINAL_ANSWER_TEMPLATE
from backend.app.rag.config import QUERY_REWRITE_HISTORY_TURNS


router = APIRouter(
    prefix="/threads",
    tags=["threads"],
)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def attach_file_ids(db: AsyncSession, sources: list[dict]) -> None:
    """Maps each source's raw MinIO object name back to its File row, so the
    frontend can link a citation to preview/download that file — and so the
    displayed name is the original filename, not the timestamp-prefixed
    MinIO object name."""

    object_names = {s["source"] for s in sources if s.get("source")}
    if not object_names:
        return

    result = await db.execute(
        select(FileModel.id, FileModel.filename, FileModel.vector_storage_path).where(
            FileModel.vector_storage_path.in_(object_names)
        )
    )
    mapping = {row.vector_storage_path: (str(row.id), row.filename) for row in result.all()}

    for s in sources:
        match = mapping.get(s.get("source"))
        s["file_id"] = match[0] if match else None
        if match:
            s["name"] = match[1]


async def resolve_allowed_sources(db: AsyncSession, user: User) -> list[str] | None:
    """None means unrestricted (admin). Otherwise, the Qdrant `source` values
    (MinIO object names) of files this user can see — ones they uploaded, or
    ones granted to any group they belong to."""

    if user.is_admin:
        return None

    user_group_ids = [g.id for g in user.groups]

    conditions = [FileModel.user_id == user.id]
    if user_group_ids:
        conditions.append(
            FileModel.id.in_(
                select(file_groups.c.file_id).where(file_groups.c.group_id.in_(user_group_ids))
            )
        )

    result = await db.execute(
        select(FileModel.vector_storage_path).where(
            FileModel.deleted_at.is_(None),
            FileModel.vector_storage_path.is_not(None),
            or_(*conditions),
        )
    )
    return [row[0] for row in result.all()]


@router.post(
    "",
    response_model=ThreadResponse,
)
async def create_thread(
    payload: ThreadCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    thread = Thread(
        user_id=user.id,
        name=payload.name,
    )

    db.add(thread)

    await db.commit()
    await db.refresh(thread)

    return thread


@router.get(
    "",
    response_model=list[ThreadResponse],
)
async def list_threads(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(Thread)
        .where(
            Thread.user_id == user.id,
            Thread.deleted_at.is_(None),
        )
        .order_by(
            Thread.updated_at.desc()
        )
    )

    return result.scalars().all()


@router.get(
    "/{thread_id}",
    response_model=ThreadDetailResponse,
)
async def get_thread(
    thread_id: UUID,
    limit: int = Query(
        default=50,
        le=100,
    ),
    cursor: UUID | None = None,

    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

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
            status_code=404,
            detail="Thread not found",
        )


    query = (
        select(Message)
        .where(
            Message.thread_id == thread.id
        )
        .order_by(
            Message.created_at.desc()
        )
        .limit(limit + 1)
    )


    if cursor:
        query = query.where(
            Message.id < cursor
        )


    result = await db.execute(query)

    messages = list(
        result.scalars().all()
    )


    next_cursor = None

    if len(messages) > limit:
        next_cursor = messages[-1].id
        messages = messages[:limit]


    messages.reverse()


    return {
        "id": thread.id,
        "name": thread.name,
        "created_at": thread.created_at,
        "updated_at": thread.updated_at,
        "messages": messages,
        "next_cursor": next_cursor,
    }


@router.patch(
    "/{thread_id}",
    response_model=ThreadResponse,
)
async def update_thread(
    thread_id: UUID,
    payload: ThreadUpdate,

    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

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
            status_code=404,
            detail="Thread not found",
        )


    if payload.name is not None:
        thread.name = payload.name


    thread.updated_at = datetime.now(timezone.utc)


    await db.commit()
    await db.refresh(thread)


    return thread


@router.delete(
    "/{thread_id}",
)
async def delete_thread(
    thread_id: UUID,

    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

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
            status_code=404,
            detail="Thread not found",
        )


    thread.deleted_at = datetime.now(timezone.utc)

    await db.commit()


    return {
        "success": True
    }


@router.post(
    "/{thread_id}/messages",
)
async def send_message(
    thread_id: UUID,
    payload: MessageCreate,

    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

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
            status_code=404,
            detail="Thread not found",
        )


    user_message = Message(
        thread_id=thread.id,
        role="user",
        content=payload.content,
    )

    db.add(user_message)

    thread.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user_message)


    # Recent turns, as plain text, just to make the query rewrite step aware
    # of context ("it"/"this" references) — not sent to the vectorstore or
    # used directly in the final answer prompt.
    history_result = await db.execute(
        select(Message)
        .where(Message.thread_id == thread.id, Message.id != user_message.id)
        .order_by(Message.created_at.desc())
        .limit(QUERY_REWRITE_HISTORY_TURNS)
    )

    recent_turns = list(reversed(history_result.scalars().all()))
    chat_history = "\n".join(f"{m.role.capitalize()}: {m.content}" for m in recent_turns)


    async def event_stream():

        yield sse(
            "user_message",
            {
                "id": str(user_message.id),
                "role": "user",
                "content": user_message.content,
                "created_at": user_message.created_at.isoformat(),
            },
        )

        accumulated = ""
        assistant_message = None
        intermediate_steps = None

        try:
            if openai_client is None:
                yield sse("error", {"message": "OpenAI API key is not configured."})
            else:
                try:
                    rewritten_query, fallback_message = await query_rewrite(
                        message=user_message.content,
                        chat_history=chat_history,
                    )

                    intermediate_steps = {
                        "rewritten_query": rewritten_query,
                        "rejected": not bool(rewritten_query),
                        "rejection_reason": fallback_message if not rewritten_query else None,
                        "sources": [],
                    }

                    if not rewritten_query:
                        yield sse("intermediate_steps", intermediate_steps)
                        accumulated = fallback_message
                        yield sse("delta", {"content": fallback_message})
                    else:
                        allowed_sources = await resolve_allowed_sources(db, user)
                        sources = await pipeline.retrieve(
                            rewritten_query,
                            expand_context=True,
                            allowed_sources=allowed_sources,
                        )
                        await attach_file_ids(db, sources)
                        intermediate_steps["sources"] = sources

                        yield sse("intermediate_steps", intermediate_steps)

                        context = build_context(sources)
                        prompt = FINAL_ANSWER_TEMPLATE.format(context=context, message=rewritten_query)

                        stream = await openai_client.chat.completions.create(
                            model=settings.OPENAI_MODEL,
                            messages=[{"role": "user", "content": prompt}],
                            stream=True,
                        )

                        async for chunk in stream:

                            if not chunk.choices:
                                continue

                            delta = chunk.choices[0].delta.content

                            if delta:
                                accumulated += delta
                                yield sse("delta", {"content": delta})

                except Exception as e:
                    yield sse("error", {"message": str(e)})

        finally:
            # If the client disconnects (e.g. the user hits "stop"), Starlette
            # cancels this generator's task right at whichever `yield` it's
            # suspended on. Without a shield, that cancellation would also
            # interrupt the DB write below, silently dropping whatever the
            # assistant had generated so far. Shielding lets the partial
            # message persist regardless of how we got here.
            if accumulated:
                with anyio.CancelScope(shield=True):
                    assistant_message = Message(
                        thread_id=thread.id,
                        role="assistant",
                        content=accumulated,
                        intermediate_steps=intermediate_steps,
                    )

                    db.add(assistant_message)
                    thread.updated_at = datetime.now(timezone.utc)

                    await db.commit()
                    await db.refresh(assistant_message)

        # Unreachable if the client disconnected (the CancelledError from the
        # `finally` above keeps propagating past this point), which is fine —
        # there's no one left to receive these events anyway.
        if assistant_message:
            yield sse(
                "done",
                {
                    "id": str(assistant_message.id),
                    "role": "assistant",
                    "content": assistant_message.content,
                    "created_at": assistant_message.created_at.isoformat(),
                    "intermediate_steps": assistant_message.intermediate_steps,
                },
            )
        else:
            yield sse(
                "done",
                {
                    "id": None,
                    "role": "assistant",
                    "content": "",
                    "created_at": None,
                    "intermediate_steps": None,
                },
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )