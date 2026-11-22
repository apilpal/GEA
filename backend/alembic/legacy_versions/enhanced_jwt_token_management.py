"""Enhanced JWT token management tables.

Revision ID: enhanced_jwt_token_management
Revises: add_guest_user_fields
Create Date: 2025-10-19 07:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'enhanced_jwt_token_management'
down_revision = 'add_guest_user_fields'
up_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Create enhanced JWT token management tables."""

    # Create token_blacklist table for revoked tokens
    op.create_table('token_blacklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(255), nullable=False),
        sa.Column('token_type', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for token_blacklist table
    op.create_index('ix_token_blacklist_jti', 'token_blacklist', ['jti'], unique=True)
    op.create_index('ix_token_blacklist_expires_at', 'token_blacklist', ['expires_at'])

    # Create auth_audit_log table for security monitoring
    op.create_table('auth_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('device_id', sa.String(255), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('metadata', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for auth_audit_log table
    op.create_index('ix_auth_audit_log_username', 'auth_audit_log', ['username'])
    op.create_index('ix_auth_audit_log_created_at', 'auth_audit_log', ['created_at'])
    op.create_index('ix_auth_audit_log_action', 'auth_audit_log', ['action'])

    # Create refresh_tokens table for refresh token storage and rotation
    op.create_table('refresh_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(255), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('device_id', sa.String(255), nullable=False),
        sa.Column('session_id', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for refresh_tokens table
    op.create_index('ix_refresh_tokens_jti', 'refresh_tokens', ['jti'], unique=True)
    op.create_index('ix_refresh_tokens_username', 'refresh_tokens', ['username'])
    op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'])
    op.create_index('ix_refresh_tokens_session_id', 'refresh_tokens', ['session_id'])

def downgrade() -> None:
    """Drop enhanced JWT token management tables."""

    # Drop tables in reverse order (due to potential foreign key constraints)
    op.drop_table('refresh_tokens')
    op.drop_table('auth_audit_log')
    op.drop_table('token_blacklist')