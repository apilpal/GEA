"""Auth tables: token blacklist, authentication audit log and refresh tokens.

These three tables are defined in ``src/services/jwt_service.py`` but were never part
of the migrations, so a database built only by ``alembic upgrade head`` lacked them and
``/api/auth/login-enhanced`` and the token refresh/revoke endpoints failed with
"no such table". Databases that already have them (made by the older ``create_all``
setup) are left alone.

Revision ID: 0003_auth_tables
Revises: 0002_school_schema
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_auth_tables"
down_revision = "0002_school_schema"
branch_labels = None
depends_on = None

TABLES = ("token_blacklist", "auth_audit_log", "refresh_tokens")


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("token_blacklist"):
        op.create_table(
            "token_blacklist",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("jti", sa.String(255), nullable=False),
            sa.Column("token_type", sa.String(20), nullable=False),
            sa.Column("expires_at", sa.DateTime, nullable=False),
            sa.Column("reason", sa.String(100), nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )
        op.create_index("ix_token_blacklist_id", "token_blacklist", ["id"])
        op.create_index("ix_token_blacklist_jti", "token_blacklist", ["jti"], unique=True)
        op.create_index("ix_token_blacklist_expires_at", "token_blacklist", ["expires_at"])

    if not inspector.has_table("auth_audit_log"):
        op.create_table(
            "auth_audit_log",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("username", sa.String(50), nullable=False),
            sa.Column("action", sa.String(50), nullable=False),
            sa.Column("device_id", sa.String(255), nullable=False),
            sa.Column("ip_address", sa.String(45), nullable=False),
            sa.Column("success", sa.Boolean, nullable=False),
            sa.Column("reason", sa.String(255), nullable=True),
            sa.Column("metadata_json", sa.String(1000), nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False),
        )
        op.create_index("ix_auth_audit_log_id", "auth_audit_log", ["id"])
        op.create_index("ix_auth_audit_log_username", "auth_audit_log", ["username"])
        op.create_index("ix_auth_audit_log_created_at", "auth_audit_log", ["created_at"])

    if not inspector.has_table("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer, primary_key=True),
            sa.Column("jti", sa.String(255), nullable=False),
            sa.Column("username", sa.String(50), nullable=False),
            sa.Column("device_id", sa.String(255), nullable=False),
            sa.Column("session_id", sa.String(255), nullable=False),
            sa.Column("expires_at", sa.DateTime, nullable=False),
            sa.Column("is_active", sa.Boolean, nullable=False),
            sa.Column("created_at", sa.DateTime, nullable=False),
            sa.Column("last_used", sa.DateTime, nullable=True),
        )
        op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"])
        op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
        op.create_index("ix_refresh_tokens_username", "refresh_tokens", ["username"])
        op.create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table in TABLES:
        if inspector.has_table(table):
            op.drop_table(table)
