import argparse
import asyncio

import bcrypt
from sqlalchemy import select

from backend.app.db.session import SessionLocal
from backend.app.db.models import User


async def create_user(email: str, password: str, is_admin: bool):

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
            is_admin=is_admin,
        )

        db.add(user)

        await db.commit()
        await db.refresh(user)

        print(f"Created user: {user.email} (admin={user.is_admin})")
        print(f"ID: {user.id}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a user account.")
    parser.add_argument("--email", default="admin@example.com")
    parser.add_argument("--password", default="password123")
    parser.add_argument("--admin", action="store_true", help="Grant admin access")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(create_user(args.email, args.password, args.admin))
