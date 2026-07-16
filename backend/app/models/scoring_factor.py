from sqlalchemy import Boolean, Column, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class ScoringFactor(TimestampMixin, Base):
    __tablename__ = "scoring_factors"
    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    code        = Column(String(40), nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(Text)
    icon_class  = Column(String(80))
    color       = Column(String(30))
    weight      = Column(SmallInteger, nullable=False, default=20)
    is_active   = Column(Boolean, nullable=False, default=True)

    options = relationship(
        "ScoringFactorOption", back_populates="factor",
        order_by="ScoringFactorOption.display_order", cascade="all, delete-orphan",
    )


class ScoringFactorOption(TimestampMixin, Base):
    __tablename__ = "scoring_factor_options"
    id                = Column(SmallInteger, primary_key=True, autoincrement=True)
    scoring_factor_id = Column(SmallInteger, ForeignKey("scoring_factors.id", ondelete="CASCADE"), nullable=False)
    label             = Column(String(100), nullable=False)
    score_points      = Column(SmallInteger, nullable=False)
    display_order     = Column(SmallInteger, nullable=False, default=0)

    factor = relationship("ScoringFactor", back_populates="options")
