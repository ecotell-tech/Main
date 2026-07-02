"""
form_config.py — Persistent store for Leadership-managed form configuration.

Rows are scoped per-manager (manager_user_id > 0) or global (manager_user_id = 0).
When loading config for an agronomist the service resolves their manager's rows first
and falls back to the global rows (manager_user_id = 0) for any missing keys.

Usage:
    key="dropdowns"        value_json = { crops: [...], soilType: [...], ... }
    key="extendedFields"   value_json = [ { id, key, label, type, step, ... }, ... ]
    key="steps"            value_json = [ { id, label, enabled, order }, ... ]
    key="moduleAccess"     value_json = { routePath: [role, ...], ... }
"""

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, JSON, String, UniqueConstraint, func

from app.database import Base


class FormConfig(Base):
    __tablename__ = "form_config"
    __table_args__ = (
        # Composite unique: one row per (config_key, manager_user_id).
        # manager_user_id = 0 → global default; >0 → per-manager override.
        UniqueConstraint("config_key", "manager_user_id", name="uq_form_config_key_manager"),
    )

    id              = Column(BigInteger, primary_key=True, autoincrement=True)
    config_key      = Column(String(60), nullable=False, index=True)
    value_json      = Column(JSON, nullable=False)

    # 0 = global / default; manager's user.id = per-manager override.
    # NOT NULL with server_default="0" keeps the composite UNIQUE deterministic in MySQL.
    manager_user_id = Column(
        BigInteger,
        nullable=False,
        server_default="0",
        index=True,
        comment="0=global default; >0=per-manager override (references users.id)",
    )

    # Audit
    updated_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
