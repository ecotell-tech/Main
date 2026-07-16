from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, String

from app.database import Base
from app.models.base import TimestampMixin


class NotificationPreference(TimestampMixin, Base):
    __tablename__ = "notification_preferences"

    id                 = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id            = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type  = Column(String(60), nullable=False)  # visitReminders | planUpdates | newAssignments
    is_enabled         = Column(Boolean, nullable=False, default=True)
