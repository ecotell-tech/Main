"""
form_template.py — Per-manager form configuration template.

One row per manager (manager_user_id > 0) or one global default row
(manager_user_id = 0).  All four configuration sections live as JSON
columns so there is no per-section lookup overhead.

Resolution order for a given user:
  1. Row where manager_user_id = that user's manager id (most specific).
  2. Row where manager_user_id = 0 (global default / system fallback).
"""

from sqlalchemy import (
    BigInteger, Column, DateTime, ForeignKey,
    JSON, String, UniqueConstraint, func,
)

from app.database import Base


class FormTemplate(Base):
    __tablename__ = "form_templates"
    __table_args__ = (
        UniqueConstraint("manager_user_id", name="uq_form_templates_manager"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 0 = global default; manager's users.id = per-manager template.
    manager_user_id = Column(
        BigInteger,
        nullable=False,
        server_default="0",
        index=True,
    )

    # Denormalised — avoids a join when agronomists read "Configured by …".
    configured_by_name    = Column(String(120), nullable=False, server_default="")
    configured_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Config sections ──────────────────────────────────────────
    dropdowns       = Column(JSON, nullable=True)
    extended_fields  = Column(JSON, nullable=True)
    steps           = Column(JSON, nullable=True)
    module_access   = Column(JSON, nullable=True)
    territory       = Column(JSON, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
