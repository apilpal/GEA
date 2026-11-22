"""Migration 0003: the token blacklist, audit log and refresh token tables.

Run from backend/:   python -m pytest tests_school -q
"""
import sqlalchemy as sa
from alembic import command

from src.core.models import Base
import src.services.jwt_service  # noqa: F401  (registers the three auth tables on Base)

from .helpers import alembic_config, migrate

AUTH_TABLES = ("token_blacklist", "auth_audit_log", "refresh_tokens")


def inspector(db_path):
    return sa.inspect(sa.create_engine(f"sqlite:///{db_path}"))


def test_upgrade_creates_auth_tables(tmp_path):
    db = tmp_path / "fresh.db"
    migrate(db)

    insp = inspector(db)
    for table in AUTH_TABLES:
        assert insp.has_table(table), f"{table} missing after alembic upgrade head"

    unique_indexes = {ix["name"] for ix in insp.get_indexes("token_blacklist") if ix["unique"]}
    assert "ix_token_blacklist_jti" in unique_indexes


def test_upgrade_keeps_auth_tables_that_the_old_setup_created(tmp_path):
    """Databases made by the old create_all setup already have these tables (and rows)."""
    db = tmp_path / "old.db"
    cfg = alembic_config(db)
    command.upgrade(cfg, "0002_school_schema")

    engine = sa.create_engine(f"sqlite:///{db}")
    Base.metadata.create_all(engine, tables=[Base.metadata.tables[t] for t in AUTH_TABLES])
    with engine.begin() as conn:
        conn.execute(sa.text(
            "INSERT INTO token_blacklist (jti, token_type, expires_at, reason, created_at) "
            "VALUES ('keep-me', 'refresh', '2030-01-01', 'test', '2026-01-01')"
        ))

    command.upgrade(cfg, "head")  # must not fail with "table already exists"

    with engine.connect() as conn:
        assert conn.execute(sa.text("SELECT jti FROM token_blacklist")).scalar() == "keep-me"


def test_downgrade_removes_only_the_auth_tables(tmp_path):
    db = tmp_path / "down.db"
    cfg = alembic_config(db)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "0002_school_schema")

    insp = inspector(db)
    for table in AUTH_TABLES:
        assert not insp.has_table(table)
    for table in ("students", "drivers", "users", "fee_invoices"):
        assert insp.has_table(table)


def test_auth_tables_match_the_models(tmp_path):
    db = tmp_path / "match.db"
    migrate(db)
    insp = inspector(db)
    for table in AUTH_TABLES:
        wanted = {c.name for c in Base.metadata.tables[table].columns}
        have = {c["name"] for c in insp.get_columns(table)}
        assert wanted == have, f"{table}: columns differ ({wanted ^ have})"
