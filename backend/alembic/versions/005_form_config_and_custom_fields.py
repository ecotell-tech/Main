"""Add form_config table and custom_fields to farmers

Revision ID: 005
Revises: 004
Create Date: 2026-06-13

Two changes:
  1. New `form_config` table — stores Leadership-managed form configuration
     (dropdown options, extended field definitions, step settings) as JSON
     blobs keyed by config_key.  One row per config section; schema-free so
     no future migrations are needed when Leadership adds or removes fields.

  2. `custom_fields` JSON column on `farmers` — nullable, defaulting to NULL.
     Stores the agronomist-entered values for any Leadership-defined extended
     fields during farmer registration.  Adding/removing extended fields never
     requires a schema migration because all values live in a single JSON blob.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.dialects.mysql import BIGINT as UBIGINT

revision      = "005"
down_revision = "004"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── 1. form_config table ─────────────────────────────────────────────────
    op.create_table(
        "form_config",
        sa.Column("id",         sa.BigInteger(),   nullable=False, autoincrement=True),
        sa.Column("config_key", sa.String(60),     nullable=False),
        sa.Column("value_json", mysql.JSON(),       nullable=False),
        sa.Column("updated_by", UBIGINT(unsigned=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(),     nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP"),
                  onupdate=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("config_key", name="uq_form_config_key"),
        sa.ForeignKeyConstraint(["updated_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_form_config_key", "form_config", ["config_key"])

    # ── 2. custom_fields column on farmers ───────────────────────────────────
    op.add_column(
        "farmers",
        sa.Column(
            "custom_fields",
            mysql.JSON(),
            nullable=True,
            comment="Extended field values configured by Leadership — stored schema-free",
        ),
    )


def downgrade() -> None:
    op.drop_column("farmers", "custom_fields")
    op.drop_index("ix_form_config_key", table_name="form_config")
    op.drop_table("form_config")
