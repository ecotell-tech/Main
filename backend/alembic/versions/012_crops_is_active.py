"""Add is_active to crops — backs the Crop Master Deactivate/Activate action

Revision ID: 012
Revises: 011
Create Date: 2026-07-15
"""

from alembic import op
import sqlalchemy as sa

revision      = "012"
down_revision = "011"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "crops",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )


def downgrade() -> None:
    op.drop_column("crops", "is_active")
