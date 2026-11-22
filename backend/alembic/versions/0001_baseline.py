"""Baseline: students, drivers, users and chat tables as they were before the school schema.

Databases made by the old ``create_all`` setup already have these tables, so each one
is only created when missing. Fresh databases get the original (pre-school) shape and
revision 0002 then upgrades it.

Revision ID: 0001_baseline
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def _missing(name: str) -> bool:
    return name not in sa.inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if _missing("students"):
        op.create_table(
            "students",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("route", sa.String(50)),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("father_name", sa.String(100)),
            sa.Column("mobile", sa.String(15), unique=True),
            sa.Column("class_", sa.String(20)),
            sa.Column("address", sa.String(200)),
            sa.Column("fees", sa.Float),
            sa.Column("status", sa.String(20), nullable=False, server_default="active"),
            sa.Column("created_at", sa.Integer, nullable=False),
            sa.Column("updated_at", sa.Integer, nullable=False),
        )
        for col in ("route", "name", "father_name", "class_", "status", "created_at", "updated_at"):
            op.create_index(f"ix_students_{col}", "students", [col])
    if _missing("drivers"):
        op.create_table(
            "drivers",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("name", sa.String(100), nullable=False, unique=True),
            sa.Column("route", sa.String(50)),
            sa.Column("status", sa.String(20), nullable=False, server_default="active"),
            sa.Column("vehicle_number", sa.String(20), unique=True),
            sa.Column("contact_number", sa.String(15), unique=True),
            sa.Column("license_number", sa.String(20), unique=True),
            sa.Column("experience_years", sa.Integer),
            sa.Column("created_at", sa.Integer, nullable=False),
            sa.Column("updated_at", sa.Integer, nullable=False),
        )
    if _missing("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("username", sa.String(50), nullable=False, unique=True),
            sa.Column("email", sa.String(100), nullable=False, unique=True),
            sa.Column("hashed_password", sa.String(255), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
            sa.Column("is_bypass_user", sa.Boolean, nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("updated_at", sa.DateTime, nullable=False),
        )

    # Chat tables are unchanged by the school work; create any that are missing
    # from their model definitions.
    from src.core.models import Base, chat_models  # noqa: F401

    bind = op.get_bind()
    for name in ("chat_conversations", "chat_messages", "chat_contexts", "chat_sessions"):
        Base.metadata.tables[name].create(bind, checkfirst=True)


def downgrade() -> None:
    raise NotImplementedError("The baseline cannot be downgraded; restore a backup instead.")
