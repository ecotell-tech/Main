"""
SQLAlchemy column mixins — eliminate timestamp boilerplate from every model.

Usage:
    class MyModel(SoftDeleteMixin, Base):
        __tablename__ = "my_table"
        id = Column(Integer, primary_key=True)
        # created_at, updated_at, deleted_at are inherited
"""
from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.orm import declared_attr


class TimestampMixin:
    """Adds created_at and updated_at columns."""

    @declared_attr
    def created_at(cls):
        return Column(DateTime, default=datetime.utcnow, nullable=False)

    @declared_attr
    def updated_at(cls):
        return Column(
            DateTime,
            default=datetime.utcnow,
            onupdate=datetime.utcnow,
            nullable=False,
        )


class SoftDeleteMixin(TimestampMixin):
    """Adds created_at, updated_at, and deleted_at (soft-delete) columns."""

    @declared_attr
    def deleted_at(cls):
        return Column(DateTime, nullable=True)
