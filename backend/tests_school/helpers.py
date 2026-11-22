"""Small helpers shared by the auth and seed tests."""
import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BACKEND = Path(__file__).resolve().parent.parent


def alembic_config(db_path: Path) -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    return cfg


def migrate(db_path: Path, revision: str = "head") -> None:
    command.upgrade(alembic_config(db_path), revision)


def async_url(db_path: Path) -> str:
    return f"sqlite+aiosqlite:///{db_path}"


def run_with_session(db_path: Path, work):
    """Run ``await work(session)`` against the SQLite file and return its result."""
    async def go():
        engine = create_async_engine(async_url(db_path))
        try:
            async with async_sessionmaker(engine, expire_on_commit=False)() as session:
                return await work(session)
        finally:
            await engine.dispose()

    return asyncio.run(go())
