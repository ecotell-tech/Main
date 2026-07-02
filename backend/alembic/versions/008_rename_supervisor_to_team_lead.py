"""Rename supervisor role to team_lead — hierarchy update

Revision ID: 008
Revises: 007
Create Date: 2026-06-14

Changes:
  - roles.name  'supervisor' -> 'team_lead'
  - roles.display_name 'Supervisor' -> 'Team Lead'
  - roles.description updated to reflect new hierarchy

Idempotent: safe to run more than once.
"""

from alembic import op
from sqlalchemy import text


revision      = "008"
down_revision = "007"
branch_labels = None
depends_on    = None


def _role_exists(conn, name: str) -> bool:
    result = conn.execute(
        text("SELECT COUNT(*) FROM roles WHERE name = :name"),
        {"name": name},
    )
    return result.scalar() > 0


def upgrade() -> None:
    conn = op.get_bind()

    supervisor_exists = _role_exists(conn, "supervisor")
    team_lead_exists  = _role_exists(conn, "team_lead")

    if supervisor_exists and not team_lead_exists:
        conn.execute(text("""
            UPDATE roles
            SET name         = 'team_lead',
                display_name = 'Team Lead',
                description  = 'Manages a team of Field Representatives and Data Entry Operators; configures forms for their team'
            WHERE name = 'supervisor'
        """))

    elif supervisor_exists and team_lead_exists:
        # Partial state — remove stale supervisor row
        conn.execute(text("DELETE FROM roles WHERE name = 'supervisor'"))

    # Ensure team_lead has the permissions needed to configure forms
    conn.execute(text("""
        INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.name IN (
            'view_farmers','create_farmer','edit_farmer','view_visits','create_visit',
            'view_plans','approve_plan','view_reports','export_reports',
            'view_settings','edit_settings','manage_users','manage_roles'
        )
        WHERE r.name = 'team_lead'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    if _role_exists(conn, "team_lead") and not _role_exists(conn, "supervisor"):
        conn.execute(text("""
            UPDATE roles
            SET name         = 'supervisor',
                display_name = 'Supervisor',
                description  = 'Oversees a cluster of agronomists within a territory'
            WHERE name = 'team_lead'
        """))
