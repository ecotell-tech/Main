"""Admin router — user management (onboarding, edit, status toggle)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import Role, User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.utils.security import hash_password

router = APIRouter()

# ── Helpers ───────────────────────────────────────────────────

_TITLES = {"dr.", "mr.", "mrs.", "ms.", "prof.", "dr", "mr", "mrs", "ms", "prof"}

def _initials(name: str) -> str:
    parts = [p for p in name.split() if p.lower() not in _TITLES]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    if parts:
        return parts[0][:2].upper() if len(parts[0]) >= 2 else parts[0].upper()
    return name[:2].upper()


async def _resolve_role(db: AsyncSession, role_name: str) -> Role:
    role = (
        await db.execute(select(Role).where(Role.name == role_name))
    ).scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=400, detail=f"Unknown role: {role_name}")
    return role


def _row_to_out(row: dict) -> UserOut:
    return UserOut(
        id=row["id"],
        name=row["name"],
        mobile=row["mobile"],
        email=row.get("email"),
        role=row["role"],
        manager_user_id=row.get("manager_user_id"),
        territory=row.get("territory"),
        district=row.get("district"),
        status=row["status"],
        initials=_initials(row["name"]),
        joined_date=(
            row["created_at"].strftime("%-d %b %Y")
            if row.get("created_at") else None
        ),
    )


async def _next_employee_code(db: AsyncSession) -> str:
    """Return the next sequential USR-NNNN code based on the current MAX."""
    result = await db.execute(
        select(func.max(User.employee_code)).where(User.employee_code.like("USR-%"))
    )
    max_code: str | None = result.scalar_one_or_none()
    if max_code:
        try:
            n = int(max_code.split("-", 1)[1]) + 1
        except (IndexError, ValueError):
            n = 1
    else:
        n = 1
    return f"USR-{n:04d}"


async def _base_user_query(db: AsyncSession, viewer: User):
    """Return (query, role_name) — query is already scoped to what viewer may see."""
    role_name = viewer.role.name

    q = (
        select(
            User.id, User.name, User.mobile, User.email,
            User.status, User.manager_user_id,
            User.territory, User.district,
            User.created_at,
            Role.name.label("role"),
        )
        .join(Role, User.role_id == Role.id)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
    )

    if role_name in ("team_lead", "supervisor"):
        # Self + direct reports only
        q = q.where(
            or_(User.id == viewer.id, User.manager_user_id == viewer.id)
        )
    elif role_name == "admin":
        # Self + their team leads + those team leads' reports
        tl_ids = (
            select(User.id)
            .where(User.manager_user_id == viewer.id, User.deleted_at.is_(None))
            .scalar_subquery()
        )
        q = q.where(
            or_(
                User.id == viewer.id,
                User.manager_user_id == viewer.id,
                User.manager_user_id.in_(tl_ids),
            )
        )
    # manager (Leadership) sees all — no filter

    return q


# ── Endpoints ─────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(require_permission("manage_users")),
):
    q = await _base_user_query(db, current_user)
    rows = (await db.execute(q)).mappings().all()
    return [_row_to_out(dict(r)) for r in rows]


@router.post("/users", status_code=201, response_model=UserOut)
async def create_user(
    body:         UserCreate,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(require_permission("manage_users")),
):
    # Duplicate mobile check
    existing = (
        await db.execute(
            select(User).where(User.mobile == body.mobile, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Mobile number already registered")

    role = await _resolve_role(db, body.role)
    employee_code = await _next_employee_code(db)

    user = User(
        employee_code   = employee_code,
        name            = body.name.strip(),
        mobile          = body.mobile,
        email           = body.email or None,
        role_id         = role.id,
        manager_user_id = body.manager_user_id or None,
        territory       = body.territory or None,
        district        = body.district or None,
        status          = body.status,
        password_hash   = hash_password(body.mobile),  # default password = mobile
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await db.refresh(user, ["role"])

    return _row_to_out({
        "id":              user.id,
        "name":            user.name,
        "mobile":          user.mobile,
        "email":           user.email,
        "role":            role.name,
        "manager_user_id": user.manager_user_id,
        "territory":       user.territory,
        "district":        user.district,
        "status":          user.status,
        "created_at":      user.created_at,
    })


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id:      int,
    body:         UserUpdate,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(require_permission("manage_users")),
):
    user = (
        await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        user.name = body.name.strip()
    if body.email is not None:
        user.email = body.email or None
    if body.manager_user_id is not None:
        user.manager_user_id = body.manager_user_id
    if body.territory is not None:
        user.territory = body.territory or None
    if body.district is not None:
        user.district = body.district or None
    if body.status is not None:
        user.status = body.status

    await db.commit()
    await db.refresh(user)

    role_name = (
        await db.execute(select(Role.name).where(Role.id == user.role_id))
    ).scalar_one()

    return _row_to_out({
        "id":              user.id,
        "name":            user.name,
        "mobile":          user.mobile,
        "email":           user.email,
        "role":            role_name,
        "manager_user_id": user.manager_user_id,
        "territory":       user.territory,
        "district":        user.district,
        "status":          user.status,
        "created_at":      user.created_at,
    })


@router.patch("/users/{user_id}/status", response_model=UserOut)
async def toggle_user_status(
    user_id:      int,
    db:           AsyncSession = Depends(get_db),
    current_user: User         = Depends(require_permission("manage_users")),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user = (
        await db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "inactive" if user.status == "active" else "active"
    await db.commit()
    await db.refresh(user)

    role_name = (
        await db.execute(select(Role.name).where(Role.id == user.role_id))
    ).scalar_one()

    return _row_to_out({
        "id":              user.id,
        "name":            user.name,
        "mobile":          user.mobile,
        "email":           user.email,
        "role":            role_name,
        "manager_user_id": user.manager_user_id,
        "territory":       user.territory,
        "district":        user.district,
        "status":          user.status,
        "created_at":      user.created_at,
    })


# ── Stub endpoints (permissions, scoring) ─────────────────────

@router.get("/permissions")
async def get_permissions(current_user: User = Depends(require_permission("manage_roles"))):
    return {"matrix": []}


@router.put("/permissions")
async def update_permissions(current_user: User = Depends(require_permission("manage_roles"))):
    return {"message": "permissions updated"}


@router.get("/scoring")
async def get_scoring(current_user: User = Depends(require_permission("edit_settings"))):
    return {"factors": []}


@router.put("/scoring")
async def update_scoring(current_user: User = Depends(require_permission("edit_settings"))):
    return {"message": "scoring updated"}
