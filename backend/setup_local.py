"""One-time local setup: create the database tables and the first admin user.

Run from the backend folder (scripts/termux-setup.sh does this for you):

    python setup_local.py

For a non-interactive run set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD.
Safe to run again: existing tables and users are left alone.
"""

import asyncio
import getpass
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
os.chdir(BACKEND_DIR)  # DATABASE_URL defaults to a path relative to backend/
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "src"))

if not os.getenv("SECRET_KEY"):
    # config.py loads backend/.env.development; fail early with a clear message.
    env_file = BACKEND_DIR / ".env.development"
    if not env_file.exists():
        sys.exit("Missing backend/.env.development - run scripts/termux-setup.sh first.")

from sqlalchemy import select, func  # noqa: E402

from core.models.models import Base, DBUser, CreateUserRequest, SessionLocal, sync_engine  # noqa: E402
from utils.user_utils import create_user  # noqa: E402


def ask(prompt: str, default: str = "") -> str:
    value = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
    return value or default


async def admin_exists() -> bool:
    async with SessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(DBUser).where(DBUser.role == "admin"))
        return bool(count)


async def make_admin() -> None:
    username = os.getenv("ADMIN_USERNAME") or ask("Admin username", "admin")
    email = os.getenv("ADMIN_EMAIL") or ask("Admin email", "admin@school.local")
    password = os.getenv("ADMIN_PASSWORD")
    if not password:
        while True:
            password = getpass.getpass("Admin password (min 8 characters): ")
            if len(password) >= 8 and password == getpass.getpass("Repeat password: "):
                break
            print("Passwords did not match or are too short. Try again.")
    async with SessionLocal() as db:
        await create_user(db, CreateUserRequest(username=username, email=email, password=password, role="admin"))
    print(f"Created admin user '{username}'.")


async def main() -> None:
    Base.metadata.create_all(sync_engine)
    print("Database tables are ready.")
    if await admin_exists():
        print("An admin user already exists - nothing to do.")
    else:
        await make_admin()


if __name__ == "__main__":
    asyncio.run(main())
