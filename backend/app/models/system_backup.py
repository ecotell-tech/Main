from sqlalchemy import BigInteger, Column, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from app.database import Base


class SystemBackup(Base):
    __tablename__ = "system_backups"

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    backup_type          = Column(Enum("full", "incremental", "differential"), nullable=False, default="full")
    status               = Column(Enum("running", "completed", "failed"), nullable=False, default="running")
    file_size_mb         = Column(Numeric(10, 2))
    destination          = Column(String(255))
    triggered_by_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"))
    started_at           = Column(DateTime, nullable=False, server_default=func.now())
    completed_at         = Column(DateTime)
    notes                = Column(Text)
    created_at           = Column(DateTime, nullable=False, server_default=func.now())
