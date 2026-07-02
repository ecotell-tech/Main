"""Per-manager form configuration and agronomist hierarchy

Revision ID: 006
Revises: 005
Create Date: 2026-06-13

Changes:
  1. users.manager_user_id   — nullable FK (self-ref) mapping each agronomist /
                               supervisor to their managing user.
  2. form_config: add manager_user_id column (0 = global default, >0 = per-manager).
     Drop the single-column unique on config_key and replace it with a composite
     unique on (config_key, manager_user_id) so each manager can have their own
     config rows alongside the global defaults.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.mysql import BIGINT as UBIGINT

revision      = "006"
down_revision = "005"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── 1. users.manager_user_id ────────────────────────────────────────────
    op.add_column(
        "users",
        sa.Column(
            "manager_user_id",
            UBIGINT(unsigned=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
            comment="The managing user (manager / supervisor) this account reports to",
        ),
    )
    op.create_index("ix_users_manager_user_id", "users", ["manager_user_id"])

    # ── 2. form_config.manager_user_id ──────────────────────────────────────
    # Drop the existing single-column unique constraint first.
    op.drop_index("ix_form_config_key", table_name="form_config")
    op.drop_constraint("uq_form_config_key", table_name="form_config", type_="unique")

    op.add_column(
        "form_config",
        sa.Column(
            "manager_user_id",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
            comment=(
                "0 = global / default config; >0 = per-manager override "
                "(references users.id). NOT NULL so composite UNIQUE works in MySQL."
            ),
        ),
    )

    # Composite unique: one row per (key, manager).
    op.create_unique_constraint(
        "uq_form_config_key_manager",
        "form_config",
        ["config_key", "manager_user_id"],
    )
    op.create_index(
        "ix_form_config_key_manager",
        "form_config",
        ["config_key", "manager_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_form_config_key_manager", table_name="form_config")
    op.drop_constraint("uq_form_config_key_manager", table_name="form_config", type_="unique")
    op.drop_column("form_config", "manager_user_id")

    op.create_unique_constraint("uq_form_config_key", "form_config", ["config_key"])
    op.create_index("ix_form_config_key", "form_config", ["config_key"])

    op.drop_index("ix_users_manager_user_id", table_name="users")
    op.drop_column("users", "manager_user_id")
