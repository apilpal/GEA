"""Remove guest user functionality.

Revision ID: remove_guest_user_functionality
Revises: add_guest_id_to_users
Create Date: 2025-03-08 16:37:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_guest_user_functionality'
down_revision = 'add_guest_id_to_users'
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Remove guest user functionality from users table."""
    # Drop indexes on guest-related columns (if they exist)
    # Note: Index names may vary, but we try the known names from previous migrations
    op.drop_index('ix_users_guest_token', table_name='users', if_exists=True)
    op.drop_index('ix_users_is_guest', table_name='users', if_exists=True)
    op.drop_index('ix_users_guest_id', table_name='users', if_exists=True)

    # Drop guest-related columns
    op.drop_column('users', 'is_guest')
    op.drop_column('users', 'guest_token')
    op.drop_column('users', 'expires_at')
    op.drop_column('users', 'guest_id')

def downgrade() -> None:
    """Restore guest user functionality to users table."""
    # Re-add guest-related columns with same definitions as in original migrations
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('guest_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('guest_id', sa.String(255), nullable=True))

    # Re-create indexes
    op.create_index('ix_users_is_guest', 'users', ['is_guest'])
    op.create_index('ix_users_guest_token', 'users', ['guest_token'], unique=True)
    op.create_index('ix_users_guest_id', 'users', ['guest_id'], unique=True)
