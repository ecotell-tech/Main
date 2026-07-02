from datetime import datetime

from sqlalchemy import BigInteger, Column, Date, DateTime, Enum, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class VisitType(TimestampMixin, Base):
    __tablename__ = "visit_types"
    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    name        = Column(String(80), nullable=False, unique=True)
    description = Column(Text)


class Visit(TimestampMixin, Base):
    __tablename__ = "visits"

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    visit_code           = Column(String(20), nullable=False, unique=True)
    farmer_id            = Column(BigInteger, ForeignKey("farmers.id"),     nullable=False)
    conducted_by_user_id = Column(BigInteger, ForeignKey("users.id"),       nullable=False)
    visit_type_id        = Column(SmallInteger, ForeignKey("visit_types.id"), nullable=False)
    related_plan_id      = Column(BigInteger, ForeignKey("consulting_plans.id"))
    scheduled_date       = Column(Date)
    visited_date         = Column(Date)
    location             = Column(String(150))
    status               = Column(
        Enum("pending", "completed", "cancelled", "overdue"),
        nullable=False, default="pending",
    )
    notes = Column(Text)

    farmer       = relationship("Farmer",    foreign_keys=[farmer_id])
    conducted_by = relationship("User",      foreign_keys=[conducted_by_user_id])
    visit_type   = relationship("VisitType", foreign_keys=[visit_type_id])
