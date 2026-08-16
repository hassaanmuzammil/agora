from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import Group, User
from backend.app.api.auth import get_current_user, require_admin
from backend.app.schemas.auth import UserResponse
from backend.app.schemas.groups import GroupResponse, GroupCreate

router = APIRouter(tags=["groups"])


@router.get("/groups", response_model=list[GroupResponse])
async def list_groups(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).order_by(Group.name))
    return result.scalars().all()


@router.post("/groups", response_model=GroupResponse)
async def create_group(
    payload: GroupCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Group).where(Group.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A group with this name already exists")

    group = Group(name=payload.name, description=payload.description)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.deleted_at.is_(None)).order_by(User.email)
    )
    return result.scalars().all()


@router.post("/groups/{group_id}/members/{user_id}", response_model=UserResponse)
async def add_group_member(
    group_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    group = (await db.execute(select(Group).where(Group.id == group_id))).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    target_user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if group not in target_user.groups:
        target_user.groups.append(group)
        await db.commit()
        await db.refresh(target_user)

    return target_user


@router.delete("/groups/{group_id}/members/{user_id}", response_model=UserResponse)
async def remove_group_member(
    group_id: UUID,
    user_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    target_user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.groups = [g for g in target_user.groups if g.id != group_id]
    await db.commit()
    await db.refresh(target_user)

    return target_user
