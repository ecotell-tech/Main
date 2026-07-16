"""Territory Assignment — District-level territories assigned to field representatives.

Simplified from the original 4-level (State/District/Taluka/Village) mock UI to
District granularity, matching what the real `territories` table supports.
One Territory row per district (auto-created on first assignment); at most one
active UserTerritoryAssignment per territory.
"""

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from app.database import Base
from app.models.base import TimestampMixin


class Territory(TimestampMixin, Base):
    __tablename__ = "territories"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(150), nullable=False)
    state_id    = Column(SmallInteger, ForeignKey("states.id"))
    district_id = Column(SmallInteger, ForeignKey("districts.id"))
    description = Column(Text)


class UserTerritoryAssignment(TimestampMixin, Base):
    __tablename__ = "user_territory_assignments"
    id                  = Column(Integer, primary_key=True, autoincrement=True)
    user_id             = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    territory_id        = Column(Integer, ForeignKey("territories.id"), nullable=False)
    assigned_by_user_id = Column(BigInteger, ForeignKey("users.id"))
    assigned_at         = Column(DateTime, nullable=False, server_default=func.now())
    is_active           = Column(Boolean, nullable=False, server_default="1")
