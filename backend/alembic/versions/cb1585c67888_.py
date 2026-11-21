"""empty message

Revision ID: cb1585c67888
Revises: 18ffafcd2ac3, add_guest_id_to_users
Create Date: 2025-10-25 18:31:52.197774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cb1585c67888'
down_revision: Union[str, Sequence[str], None] = ('18ffafcd2ac3', 'add_guest_id_to_users')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
