import asyncio

import bcrypt
from sqlalchemy import select

from backend.app.db.session import SessionLocal
from backend.app.db.models import User


async def create_user():
    email = "admin@example.com"
    password = "password123"

    async with SessionLocal() as db:

        existing = await db.execute(
            select(User).where(User.email == email)
        )

        if existing.scalar_one_or_none():
            print("User already exists")
            return

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        user = User(
            email=email,
            password=password_hash,
        )

        db.add(user)

        await db.commit()
        await db.refresh(user)

        print(f"Created user: {user.email}")
        print(f"ID: {user.id}")


if __name__ == "__main__":
    asyncio.run(create_user())