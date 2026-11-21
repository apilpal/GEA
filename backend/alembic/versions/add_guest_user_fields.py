"""Add guest user fields to users table.

Revision ID: add_guest_user_fields
Revises: d10c6437c5f1
Create Date: 2025-10-19 06:54:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_guest_user_fields'
down_revision = 'd10c6437c5f1'
up_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add guest user support fields to users table."""
    # Add is_guest column
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='0'))

    # Add guest_token column for unique guest session identification
    op.add_column('users', sa.Column('guest_token', sa.String(255), nullable=True))

    # Add expires_at column for guest session expiration tracking
    op.add_column('users', sa.Column('expires_at', sa.DateTime(), nullable=True))

    # Create index on is_guest for faster queries
    op.create_index('ix_users_is_guest', 'users', ['is_guest'])

    # Create unique index on guest_token (only for non-null values)
    op.create_index('ix_users_guest_token', 'users', ['guest_token'], unique=True)

def downgrade() -> None:
    """Remove guest user fields from users table."""
    # Drop indexes
    op.drop_index('ix_users_guest_token', table_name='users')
    op.drop_index('ix_users_is_guest', table_name='users')

    # Drop columns
    op.drop_column('users', 'expires_at')
    op.drop_column('users', 'guest_token')
    op.drop_column('users', 'is_guest')