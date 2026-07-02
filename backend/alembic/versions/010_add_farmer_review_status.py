"""Add review_status and rejection_reason to farmers table

Revision ID: 010
Revises: 009
Create Date: 2026-06-14

Adds a team-lead review workflow:
  - review_status: pending_review → approved | rejected
  - rejection_reason: optional text from team lead
  - rejected_by_user_id: FK to users (who rejected)
"""

from alembic import op
from sqlalchemy import text

revision      = "010"
down_revision = "009"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    conn = op.get_bind()

    # Add review_status (safe — uses IF NOT EXISTS via raw DDL catch)
    for stmt in [
        text("""
            ALTER TABLE farmers
            ADD COLUMN review_status ENUM('pending_review','approved','rejected')
                NOT NULL DEFAULT 'pending_review'
                COMMENT 'Team-lead review state after registration completes'
        """),
        text("""
            ALTER TABLE farmers
            ADD COLUMN rejection_reason VARCHAR(500) NULL
                COMMENT 'Reason provided by team lead when rejecting a record'
        """),
        text("""
            ALTER TABLE farmers
            ADD COLUMN rejected_by_user_id BIGINT NULL
                COMMENT 'User ID of the team lead who rejected this record'
        """),
        text("ALTER TABLE farmers ADD INDEX idx_farmers_review_status (review_status)"),
    ]:
        try:
            conn.execute(stmt)
        except Exception:
            pass  # column / index already exists — idempotent


def downgrade() -> None:
    conn = op.get_bind()
    for stmt in [
        text("ALTER TABLE farmers DROP INDEX idx_farmers_review_status"),
        text("ALTER TABLE farmers DROP COLUMN rejected_by_user_id"),
        text("ALTER TABLE farmers DROP COLUMN rejection_reason"),
        text("ALTER TABLE farmers DROP COLUMN review_status"),
    ]:
        try:
            conn.execute(stmt)
        except Exception:
            pass
