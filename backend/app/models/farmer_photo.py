from sqlalchemy import BigInteger, Column, ForeignKey, String

from app.database import Base
from app.models.base import TimestampMixin


class FarmerPhoto(TimestampMixin, Base):
    __tablename__ = "farmer_photos"

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    farmer_id  = Column(BigInteger, ForeignKey("farmers.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_type = Column(String(50),  nullable=False)   # 'farmer' | 'land' | 'well' | 'soil' | 'house'
    file_path  = Column(String(500), nullable=False)   # relative path inside uploads/
    caption    = Column(String(255))
