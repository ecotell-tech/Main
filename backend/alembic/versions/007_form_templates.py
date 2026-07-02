"""Create form_templates table — one row per manager, all sections as columns

Revision ID: 007
Revises: 006
Create Date: 2026-06-13

Replaces the multi-row form_config approach with a single-row-per-manager table.
Each column holds a complete JSON blob for one configuration section:

  dropdowns       — option lists for every wizard dropdown / toggle group
  extended_fields — Leadership-defined extra fields for farmer registration
  steps           — wizard step enable/disable/rename overrides
  module_access   — route → allowed-roles mapping for module-access control

The `configured_by_name` column (denormalised) lets agronomists see which
team lead set up the form without needing an extra join.

manager_user_id = 0 → global/system default that all managers inherit from.
manager_user_id > 0 → per-manager override; shadows the global row for that manager's team.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.dialects.mysql import BIGINT as UBIGINT

revision      = "007"
down_revision = "006"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "form_templates",

        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),

        # 0 = global default; manager's user.id = per-manager override.
        sa.Column(
            "manager_user_id",
            sa.BigInteger(),
            nullable=False,
            server_default="0",
            comment="0=global default; manager user.id=per-manager override",
        ),

        # Denormalised name — shown as 'Configured by …' in the agronomist wizard.
        sa.Column(
            "configured_by_name",
            sa.String(120),
            nullable=False,
            server_default="",
            comment="Display name of the team lead who last saved this template",
        ),
        sa.Column(
            "configured_by_user_id",
            UBIGINT(unsigned=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),

        # Config sections — each a complete JSON blob for one domain.
        sa.Column("dropdowns",      mysql.JSON(), nullable=True),
        sa.Column("extended_fields", mysql.JSON(), nullable=True),
        sa.Column("steps",          mysql.JSON(), nullable=True),
        sa.Column("module_access",  mysql.JSON(), nullable=True),

        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),

        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("manager_user_id", name="uq_form_templates_manager"),
    )
    op.create_index(
        "ix_form_templates_manager_user_id",
        "form_templates",
        ["manager_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_form_templates_manager_user_id", table_name="form_templates")
    op.drop_table("form_templates")
