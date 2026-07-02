from sqlalchemy import Column, SmallInteger, Integer, String, ForeignKey
from app.database import Base
from app.models.base import TimestampMixin


class State(TimestampMixin, Base):
    __tablename__ = "states"
    id   = Column(SmallInteger, primary_key=True, autoincrement=True)
    name = Column(String(80),  nullable=False, unique=True)
    code = Column(String(3))


class District(TimestampMixin, Base):
    __tablename__ = "districts"
    id       = Column(SmallInteger, primary_key=True, autoincrement=True)
    state_id = Column(SmallInteger, ForeignKey("states.id"), nullable=False)
    name     = Column(String(100), nullable=False)


class Taluka(TimestampMixin, Base):
    __tablename__ = "talukas"
    id          = Column(SmallInteger, primary_key=True, autoincrement=True)
    district_id = Column(SmallInteger, ForeignKey("districts.id"), nullable=False)
    name        = Column(String(100), nullable=False)


class Village(TimestampMixin, Base):
    __tablename__ = "villages"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    taluka_id = Column(SmallInteger, ForeignKey("talukas.id"), nullable=False)
    name      = Column(String(100), nullable=False)
    pin_code  = Column(String(10), nullable=True)
