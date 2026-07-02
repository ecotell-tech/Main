"""Wire demo user hierarchy — set manager_user_id for agronomist and DEO

Revision ID: 009
Revises: 008
Create Date: 2026-06-14

Problem:
  The original seed_demo_users.sql did not set manager_user_id for the
  agronomist (9579263798) or DEO (9000000003), so form_config_service
  _resolve_manager_id() returned 0 (global fallback) for both roles.
  The team lead's per-manager form_templates row was therefore never
  reached, and the agronomist saw static default dropdowns/fields
  instead of the team lead's configured values.

Fix:
  Set manager_user_id for:
    - Agronomist (9579263798) → Team Lead (9000000001)
    - DEO        (9000000003) → Team Lead (9000000001)
    - Team Lead  (9000000001) → Admin/Manager (9000000002)

  Also fixes role_id for the team lead demo user if it still points to
  the stale 'supervisor' role (safe even if migration 008 already ran).

Idempotent: safe to run more than once.
"""

from alembic import op
from sqlalchemy import text

revision      = "009"
down_revision = "008"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    conn = op.get_bind()

    # Fix team lead role if still set to the old 'supervisor' name
    # (in case seed_demo_users.sql was run before migration 008).
    conn.execute(text("""
        UPDATE users u
        JOIN roles r ON r.name = 'team_lead'
        JOIN roles old_r ON old_r.name IN ('supervisor', 'team_lead')
        SET u.role_id = r.id
        WHERE u.mobile = '9000000001'
          AND u.role_id = old_r.id
    """))

    # Agronomist → Team Lead
    conn.execute(text("""
        UPDATE users
        SET manager_user_id = (
            SELECT id FROM (SELECT id FROM users WHERE mobile = '9000000001') AS tl
        )
        WHERE mobile = '9579263798'
          AND (manager_user_id IS NULL OR manager_user_id = 0)
    """))

    # DEO → Team Lead
    conn.execute(text("""
        UPDATE users
        SET manager_user_id = (
            SELECT id FROM (SELECT id FROM users WHERE mobile = '9000000001') AS tl
        )
        WHERE mobile = '9000000003'
          AND (manager_user_id IS NULL OR manager_user_id = 0)
    """))

    # Team Lead → Admin (Manager)
    conn.execute(text("""
        UPDATE users
        SET manager_user_id = (
            SELECT id FROM (SELECT id FROM users WHERE mobile = '9000000002') AS mgr
        )
        WHERE mobile = '9000000001'
          AND (manager_user_id IS NULL OR manager_user_id = 0)
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("""
        UPDATE users
        SET manager_user_id = NULL
        WHERE mobile IN ('9579263798', '9000000001', '9000000003')
    """))
