"""Add is_draft to farmers

Revision ID: 004
Revises: 003
Create Date: 2026-06-08

Marks a farmer record as an in-progress wizard draft (is_draft=1) vs a
fully-registered farmer (is_draft=0).  Existing rows default to 0 so they
continue appearing in the main farmer list unchanged.

NOTE: is_draft may already exist if the DB was seeded from schema.sql —
the upgrade is skipped in that case so the migration is idempotent.
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "  AND TABLE_NAME   = :tbl "
            "  AND COLUMN_NAME  = :col"
        ),
        {"tbl": table, "col": column},
    )
    return result.scalar() > 0


def _index_exists(table: str, index: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.STATISTICS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "  AND TABLE_NAME   = :tbl "
            "  AND INDEX_NAME   = :idx"
        ),
        {"tbl": table, "idx": index},
    )
    return result.scalar() > 0


def upgrade() -> None:
    if not _column_exists("farmers", "is_draft"):
        op.add_column(
            "farmers",
            sa.Column(
                "is_draft",
                sa.SmallInteger(),
                nullable=False,
                server_default="0",
                comment="1 during step-by-step wizard; set to 0 on final submit",
            ),
        )
    if not _index_exists("farmers", "idx_farmers_is_draft"):
        op.create_index("idx_farmers_is_draft", "farmers", ["is_draft"])


def downgrade() -> None:
    if _index_exists("farmers", "idx_farmers_is_draft"):
        op.drop_index("idx_farmers_is_draft", table_name="farmers")
    if _column_exists("farmers", "is_draft"):
        op.drop_column("farmers", "is_draft")
