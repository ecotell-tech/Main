"""Add farmers.registration_source (manual vs bulk_import)

Revision ID: 015
Revises: 014
Create Date: 2026-07-17

Tracks how a farmer record was created so the Farmers list/detail pages can
show "Imported via spreadsheet" instead of implying every record was
manually keyed in. Server-controlled only — never accepted from request
bodies (see FarmerService.create()'s `source` parameter).

Existing rows default to 'manual' since there's no way to retroactively
know which pre-existing records came from a bulk import before this
column existed — a known, accepted limitation of adding tracking after
the fact, not a data-loss risk (nothing destructive here).
"""

from alembic import op
from sqlalchemy import text

revision      = "015"
down_revision = "014"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(text("""
            ALTER TABLE farmers
            ADD COLUMN registration_source ENUM('manual','bulk_import')
                NOT NULL DEFAULT 'manual'
                COMMENT 'How this record was created — set by the server, never client-provided'
        """))
    except Exception:
        pass  # column already exists — idempotent


def downgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(text("ALTER TABLE farmers DROP COLUMN registration_source"))
    except Exception:
        pass
