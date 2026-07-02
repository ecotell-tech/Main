from sqlalchemy import (
    BigInteger, Column, Date, DateTime, Enum,
    ForeignKey, SmallInteger, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin


class PlanComponentType(TimestampMixin, Base):
    __tablename__ = "plan_component_types"
    id            = Column(SmallInteger, primary_key=True, autoincrement=True)
    code          = Column(String(40),  nullable=False, unique=True)
    label         = Column(String(100), nullable=False)
    icon_class    = Column(String(80))
    display_order = Column(SmallInteger, nullable=False, default=0)
    is_active     = Column(SmallInteger, nullable=False, default=1)


class ConsultingPlan(SoftDeleteMixin, Base):
    __tablename__ = "consulting_plans"

    id                  = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_code           = Column(String(20), nullable=False, unique=True)
    farmer_id           = Column(BigInteger, ForeignKey("farmers.id"), nullable=False)
    consultant_user_id  = Column(BigInteger, ForeignKey("users.id"))
    created_by_user_id  = Column(BigInteger, ForeignKey("users.id"))
    approved_by_user_id = Column(BigInteger, ForeignKey("users.id"))
    status              = Column(
        Enum("draft", "active", "completed", "cancelled"),
        nullable=False, default="draft",
    )
    overall_status = Column(
        Enum("not_started", "plan_created", "in_progress", "completed"),
        nullable=False, default="not_started",
    )
    notes      = Column(Text)
    start_date = Column(Date)
    end_date   = Column(Date)

    farmer     = relationship("Farmer", foreign_keys=[farmer_id])
    components = relationship(
        "PlanComponentStatus",
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class PlanComponentStatus(TimestampMixin, Base):
    __tablename__ = "plan_component_statuses"

    id                = Column(BigInteger,   primary_key=True, autoincrement=True)
    plan_id           = Column(BigInteger,   ForeignKey("consulting_plans.id"),    nullable=False)
    component_type_id = Column(SmallInteger, ForeignKey("plan_component_types.id"), nullable=False)
    status            = Column(
        Enum("pending", "active", "done", "skipped"),
        nullable=False, default="pending",
    )
    completed_at = Column(DateTime)
    notes        = Column(Text)

    plan           = relationship("ConsultingPlan",    back_populates="components")
    component_type = relationship("PlanComponentType", foreign_keys=[component_type_id])
