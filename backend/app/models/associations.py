"""Pivot / association models that link farmers to master-data tables."""
from sqlalchemy import BigInteger, Column, Date, ForeignKey, SmallInteger, Integer
from app.database import Base
from app.models.base import TimestampMixin


class FarmerUserAssignment(TimestampMixin, Base):
    __tablename__ = "farmer_user_assignments"
    id                  = Column(Integer,    primary_key=True, autoincrement=True)
    farmer_id           = Column(BigInteger, ForeignKey("farmers.id"), nullable=False)
    user_id             = Column(BigInteger, ForeignKey("users.id"),   nullable=False)
    assigned_by_user_id = Column(BigInteger, ForeignKey("users.id"))
    due_date            = Column(Date)
    is_active           = Column(SmallInteger, nullable=False, default=1)


class FarmerCrop(TimestampMixin, Base):
    __tablename__ = "farmer_crops"
    id         = Column(Integer,     primary_key=True, autoincrement=True)
    farmer_id  = Column(BigInteger,  ForeignKey("farmers.id"), nullable=False)
    crop_id    = Column(SmallInteger, ForeignKey("crops.id"),   nullable=False)
    is_primary = Column(SmallInteger, nullable=False, default=0)


class FarmerChallenge(Base):
    __tablename__ = "farmer_challenges"
    farmer_id    = Column(BigInteger,  ForeignKey("farmers.id"),    primary_key=True)
    challenge_id = Column(SmallInteger, ForeignKey("challenges.id"), primary_key=True)
    noted_at     = Column(Date)


class FarmerGovtScheme(Base):
    __tablename__ = "farmer_govt_schemes"
    farmer_id       = Column(BigInteger,  ForeignKey("farmers.id"),      primary_key=True)
    scheme_id       = Column(SmallInteger, ForeignKey("govt_schemes.id"), primary_key=True)
    enrollment_date = Column(Date)


class FarmerInput(Base):
    __tablename__ = "farmer_inputs"
    farmer_id = Column(BigInteger,  ForeignKey("farmers.id"), primary_key=True)
    input_id  = Column(SmallInteger, ForeignKey("inputs.id"),  primary_key=True)


class FarmerIrrigationInfrastructure(Base):
    __tablename__ = "farmer_irrigation_infrastructure"
    farmer_id     = Column(BigInteger,  ForeignKey("farmers.id"),                          primary_key=True)
    infra_type_id = Column(SmallInteger, ForeignKey("irrigation_infrastructure_types.id"), primary_key=True)
    is_owned      = Column(SmallInteger, nullable=False, default=1)
