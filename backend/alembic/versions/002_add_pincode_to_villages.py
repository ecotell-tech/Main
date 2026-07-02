"""Add pin_code column to villages table

Revision ID: 002
Revises: 001
Create Date: 2026-06-07

Villages are the lowest level of the geography hierarchy.
Each village now carries a canonical PIN code so the farmer
registration form can auto-fill pin_code when the user selects
a village — instead of requiring manual entry.

farmers.pin_code is kept as a denormalized cache column for
backward compatibility; it should be populated from
villages.pin_code at registration time.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "villages",
        sa.Column("pin_code", sa.String(10), nullable=True, comment="Postal PIN code for this village"),
    )
    op.create_index("idx_villages_pin_code", "villages", ["pin_code"])


def downgrade() -> None:
    op.drop_index("idx_villages_pin_code", table_name="villages")
    op.drop_column("villages", "pin_code")
