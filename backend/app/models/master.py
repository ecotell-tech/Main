from sqlalchemy import Column, SmallInteger, String, Text, Enum
from app.database import Base
from app.models.base import TimestampMixin


class Crop(TimestampMixin, Base):
    __tablename__ = "crops"
    id       = Column(SmallInteger, primary_key=True, autoincrement=True)
    name     = Column(String(80),  nullable=False, unique=True)
    category = Column(String(60))
    season   = Column(String(60))


class Challenge(TimestampMixin, Base):
    __tablename__ = "challenges"
    id   = Column(SmallInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)


class GovtScheme(TimestampMixin, Base):
    __tablename__ = "govt_schemes"
    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    name        = Column(String(120), nullable=False, unique=True)
    description = Column(Text)


class Input(TimestampMixin, Base):
    __tablename__ = "inputs"
    id   = Column(SmallInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(
        Enum("chemical_fertilizer", "pesticide", "bio_fertilizer",
             "compost", "jeevamrut", "neem_product", "other"),
        nullable=False, default="other",
    )


class IrrigationInfrastructureType(TimestampMixin, Base):
    __tablename__ = "irrigation_infrastructure_types"
    id   = Column(SmallInteger, primary_key=True, autoincrement=True)
    name = Column(String(80), nullable=False, unique=True)
