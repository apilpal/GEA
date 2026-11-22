"""Add guest_id field to users table.

Revision ID: add_guest_id_to_users
Revises: enhanced_jwt_token_management
Create Date: 2025-10-22 03:41:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_guest_id_to_users'
down_revision = 'enhanced_jwt_token_management'
up_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add guest_id field to users table."""
    # Add guest_id column
    op.add_column('users', sa.Column('guest_id', sa.String(255), nullable=True))

    # Create unique index on guest_id (only for non-null values)
    op.create_index('ix_users_guest_id', 'users', ['guest_id'], unique=True)

def downgrade() -> None:
    """Remove guest_id field from users table."""
    # Drop index
    op.drop_index('ix_users_guest_id', table_name='users')

    # Drop column
    op.drop_column('users', 'guest_id')