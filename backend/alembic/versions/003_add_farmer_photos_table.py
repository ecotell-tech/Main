"""Add farmer_photos table

Revision ID: 003
Revises: 002
Create Date: 2026-06-07

Stores file paths for photos uploaded during or after farmer registration.
Each row records one photo (portrait, land, well, soil, or house) for a farmer.
Files are saved on disk under uploads/farmer_photos/ and served as static assets.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import BIGINT as UBIGINT

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "farmer_photos",
        sa.Column("id",         sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("farmer_id",  UBIGINT(unsigned=True), sa.ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("photo_type", sa.String(50),   nullable=False),
        sa.Column("file_path",  sa.String(500),  nullable=False),
        sa.Column("caption",    sa.String(255)),
        sa.Column("created_at", sa.DateTime(),   nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(),   nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_farmer_photos_farmer_id", "farmer_photos", ["farmer_id"])


def downgrade() -> None:
    op.drop_index("ix_farmer_photos_farmer_id", table_name="farmer_photos")
    op.drop_table("farmer_photos")
