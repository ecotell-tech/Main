"""Create sms_gateway_configs table — single global row for OTP SMS gateway settings

Revision ID: 011
Revises: 010
Create Date: 2026-07-15

Generic HTTP gateway config (URL/method/headers/body template with
{mobile}/{otp}/{sender_id}/{api_key}/{api_secret} placeholders), editable
by Leadership from Settings → SMS Gateway. Single row by convention (id=1).
api_key / api_secret are stored as-is; the API only ever returns them masked.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.dialects.mysql import BIGINT as UBIGINT

revision      = "011"
down_revision = "010"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "sms_gateway_configs",

        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),

        sa.Column("provider_name", sa.String(100), nullable=False, server_default=""),
        sa.Column("is_active",     sa.Boolean(),   nullable=False, server_default=sa.text("0")),

        sa.Column("http_method",   sa.String(10),  nullable=False, server_default="POST"),
        sa.Column("request_url",   sa.String(500), nullable=False, server_default=""),
        sa.Column("headers_json",  mysql.JSON(),   nullable=True),
        sa.Column("body_template", sa.Text(),      nullable=True),
        sa.Column("sender_id",     sa.String(30),  nullable=True),

        sa.Column("api_key",    sa.String(255), nullable=True),
        sa.Column("api_secret", sa.String(255), nullable=True),

        sa.Column(
            "updated_by_user_id",
            UBIGINT(unsigned=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),

        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),

        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sms_gateway_configs")
