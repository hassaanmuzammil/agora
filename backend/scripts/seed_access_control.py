import asyncio

import bcrypt
from sqlalchemy import select

from backend.app.db.session import SessionLocal
from backend.app.db.models import Group, User

GROUPS = [
    ("Engineering", "Engineering team"),
    ("Finance", "Finance team"),
    ("Marketing", "Marketing team"),
]

DEMO_USERS = [
    # email, password, group_name
    ("alice@example.com", "password123", "Engineering"),
    ("bob@example.com", "password123", "Finance"),
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed():
    async with SessionLocal() as db:

        # Ensure the existing seed user is admin.
        result = await db.execute(select(User).where(User.email == "admin@example.com"))
        admin = result.scalar_one_or_none()
        if admin and not admin.is_admin:
            admin.is_admin = True
            print("Marked admin@example.com as admin")

        # Groups
        groups_by_name = {}
        for name, description in GROUPS:
            result = await db.execute(select(Group).where(Group.name == name))
            group = result.scalar_one_or_none()
            if not group:
                group = Group(name=name, description=description)
                db.add(group)
                await db.flush()
                print(f"Created group: {name}")
            groups_by_name[name] = group

        # Demo non-admin users
        for email, password, group_name in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user:
                user = User(email=email, password=hash_password(password))
                db.add(user)
                await db.flush()
                # Refresh before touching relationships — a freshly flushed
                # (but not yet queried/refreshed) object's collections aren't
                # eligible for the `lazy="selectin"` strategy and fall back
                # to a genuine lazy load, which crashes under async SQLAlchemy.
                await db.refresh(user)
                print(f"Created user: {email} (password: {password})")

            group = groups_by_name[group_name]
            if group not in user.groups:
                user.groups.append(group)
                print(f"Added {email} to {group_name}")

        await db.commit()
        print("Seed complete")


if __name__ == "__main__":
    asyncio.run(seed())
