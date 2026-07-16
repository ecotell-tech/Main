"""Add form_templates.territory and users.territory/district columns

Revision ID: 014
Revises: 013
Create Date: 2026-07-16

These three columns were previously only ever created ad-hoc at FastAPI
startup (app/main.py's lifespan auto-migration fallback) and were never
governed by a real Alembic migration despite misleading comments there
claiming migration numbers 009/010. This migration makes them canonical:

  - form_templates.territory : State/district/taluka/village IDs selected
    by the team lead who configured this template.
  - users.territory / users.district : free-text geographic assignment
    shown on the User Management / Onboard User pages.
"""

from alembic import op
from sqlalchemy import text

revision      = "014"
down_revision = "013"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    conn = op.get_bind()

    for stmt in [
        text("""
            ALTER TABLE form_templates
            ADD COLUMN territory JSON NULL
                COMMENT 'State/district/taluka/village IDs selected by this team lead'
        """),
        text("ALTER TABLE users ADD COLUMN territory VARCHAR(120) NULL"),
        text("ALTER TABLE users ADD COLUMN district VARCHAR(80) NULL"),
    ]:
        try:
            conn.execute(stmt)
        except Exception:
            pass  # column already exists — idempotent


def downgrade() -> None:
    conn = op.get_bind()
    for stmt in [
        text("ALTER TABLE users DROP COLUMN district"),
        text("ALTER TABLE users DROP COLUMN territory"),
        text("ALTER TABLE form_templates DROP COLUMN territory"),
    ]:
        try:
            conn.execute(stmt)
        except Exception:
            pass
