from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id           = Column(SmallInteger, primary_key=True, autoincrement=True)
    name         = Column(String(60), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description  = Column(Text)
    is_active    = Column(SmallInteger, nullable=False, default=1)

    users       = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")


class Permission(TimestampMixin, Base):
    __tablename__ = "permissions"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    key         = Column("name", String(80), nullable=False, unique=True)
    label       = Column("display_name", String(120), nullable=False)
    module      = Column(String(60))
    description = Column(Text)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id       = Column(SmallInteger, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)


class User(SoftDeleteMixin, Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    employee_code = Column(String(20), nullable=False, unique=True)
    name          = Column(String(120), nullable=False)
    mobile        = Column(String(15), nullable=False, unique=True)
    email         = Column(String(180))
    password_hash = Column(String(255))
    role_id       = Column(SmallInteger, ForeignKey("roles.id"), nullable=False)
    status        = Column(Enum("active", "inactive", "suspended"), nullable=False, default="active")
    # The managing user this account reports to (agronomist → manager, etc.)
    manager_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    # Free-text geographic assignment (optional display info)
    territory = Column(String(120), nullable=True)
    district  = Column(String(80),  nullable=True)

    role    = relationship("Role", back_populates="users")
    manager = relationship("User", remote_side="User.id", foreign_keys="[User.manager_user_id]")
