"""One-time local setup: create the database tables and the first admin user.

Run from the backend folder (scripts/termux-setup.sh does this for you):

    python setup_local.py

For a non-interactive run set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD.

To set a new password for an existing user (for example if you forgot it):

    python setup_local.py --reset-password
Safe to run again: it backs up an existing database, applies any new schema
changes (Alembic) and leaves existing users alone.
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

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

from core.models.models import DBUser, CreateUserRequest, SessionLocal  # noqa: E402
from src.core.config.config import config as app_config  # noqa: E402
from utils.user_utils import create_user  # noqa: E402
from utils.auth_utils import hash_password  # noqa: E402


def ask(prompt: str, default: str = "") -> str:
    value = input(f"{prompt}{f' [{default}]' if default else ''}: ").strip()
    return value or default


def upgrade_database() -> None:
    """Bring the database to the latest schema with Alembic, backing it up first.

    Databases made by the older setup (plain create_all) are adopted automatically:
    revision 0001 only creates tables that are missing.
    """
    url = app_config.DATABASE_URL
    db_file = None
    if url.startswith("sqlite:///"):
        db_file = Path(url[len("sqlite:///"):])
        db_file.parent.mkdir(parents=True, exist_ok=True)
    if db_file is not None and db_file.exists() and db_file.stat().st_size > 0:
        import db_backup

        target = db_backup.backup(db_file, suffix="before-upgrade")
        print(f"Backed up the database to {target}")
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "head")


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


async def reset_password() -> None:
    username = ask("Username to reset", "admin")
    async with SessionLocal() as db:
        user = await db.scalar(select(DBUser).where(DBUser.username == username))
        if user is None:
            sys.exit(f"No user named '{username}'.")
        while True:
            password = getpass.getpass("New password (min 8 characters): ")
            if len(password) >= 8 and password == getpass.getpass("Repeat password: "):
                break
            print("Passwords did not match or are too short. Try again.")
        user.hashed_password = hash_password(password)
        await db.commit()
    print(f"Password updated for '{username}'.")


async def main() -> None:
    if "--reset-password" in sys.argv:
        await reset_password()
        return
    upgrade_database()
    print("Database is up to date.")
    if await admin_exists():
        print("An admin user already exists - nothing to do.")
    else:
        await make_admin()


if __name__ == "__main__":
    asyncio.run(main())
