"""Add encrypted Aadhaar/bank account columns to farmers

Revision ID: 013
Revises: 012
Create Date: 2026-07-16

The old aadhaar_masked/bank_account_masked columns were never populated (no
write path set them). Real values are now captured, encrypted at rest with
Fernet (PII_ENCRYPTION_KEY), and decrypted only for Leadership on read —
everyone else gets a masked string computed on the fly. See
app/utils/encryption.py and FarmerService.get_or_404.
"""

from alembic import op
import sqlalchemy as sa

revision      = "013"
down_revision = "012"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column("farmers", sa.Column("aadhaar_encrypted", sa.Text(), nullable=True))
    op.add_column("farmers", sa.Column("bank_account_encrypted", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("farmers", "bank_account_encrypted")
    op.drop_column("farmers", "aadhaar_encrypted")
