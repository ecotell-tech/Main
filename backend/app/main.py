from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.routers import auth, farmers, visits, dashboard, reports, admin, geography, plans, master, form_config

# Ensure base upload directory exists at startup.
# Subfolders (farmer_photos/{date}/{rep_id}/) are created dynamically per upload.
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


_CREATE_FARMER_PHOTOS = text("""
    CREATE TABLE IF NOT EXISTS farmer_photos (
        id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        farmer_id  BIGINT UNSIGNED NOT NULL,
        photo_type VARCHAR(50)     NOT NULL,
        file_path  VARCHAR(500)    NOT NULL,
        caption    VARCHAR(255)        NULL,
        created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_farmer_photos_farmer_id (farmer_id),
        CONSTRAINT fk_fp_farmer
            FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB COMMENT='Up to 5 farm photos per farmer (one per slot type)'
""")

# ADD COLUMN silently fails if the column already exists (MySQL error 1060).
_ADD_IS_DRAFT = text(
    "ALTER TABLE farmers "
    "ADD COLUMN is_draft TINYINT(1) NOT NULL DEFAULT 0 "
    "COMMENT '1 during step-by-step wizard; set to 0 on final submit'"
)

_ADD_REVIEW_STATUS = text(
    "ALTER TABLE farmers "
    "ADD COLUMN review_status ENUM('pending_review','approved','rejected') "
    "NOT NULL DEFAULT 'pending_review'"
)

_ADD_REJECTION_REASON = text(
    "ALTER TABLE farmers ADD COLUMN rejection_reason VARCHAR(500) NULL"
)

_ADD_REJECTED_BY = text(
    "ALTER TABLE farmers ADD COLUMN rejected_by_user_id BIGINT NULL"
)

# Migration 006 — manager_user_id self-ref FK on users (required for auth)
_ADD_MANAGER_USER_ID = text(
    "ALTER TABLE users "
    "ADD COLUMN manager_user_id BIGINT UNSIGNED NULL "
    "COMMENT 'The managing user (manager/supervisor) this account reports to'"
)
# Fix existing INT type if the column was already added with wrong type
_FIX_MANAGER_USER_ID_TYPE = text(
    "ALTER TABLE users "
    "MODIFY COLUMN manager_user_id BIGINT UNSIGNED NULL"
)

# Migration 005 — custom_fields JSON column on farmers
_ADD_CUSTOM_FIELDS = text(
    "ALTER TABLE farmers "
    "ADD COLUMN custom_fields JSON NULL "
    "COMMENT 'Extended field values — stored schema-free as key→value JSON'"
)

# Migration 007 — per-manager form configuration table
_CREATE_FORM_TEMPLATES = text("""
    CREATE TABLE IF NOT EXISTS form_templates (
        id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        manager_user_id       BIGINT UNSIGNED NOT NULL DEFAULT 0,
        configured_by_name    VARCHAR(120)    NOT NULL DEFAULT '',
        configured_by_user_id BIGINT UNSIGNED NULL,
        dropdowns             JSON            NULL,
        extended_fields       JSON            NULL,
        steps                 JSON            NULL,
        module_access         JSON            NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_form_templates_manager (manager_user_id),
        KEY ix_form_templates_manager_user_id (manager_user_id)
    ) ENGINE=InnoDB
""")

# Migration 010 — territory / district free-text columns on users table
_ADD_USER_TERRITORY = text(
    "ALTER TABLE users ADD COLUMN territory VARCHAR(120) NULL"
)
_ADD_USER_DISTRICT = text(
    "ALTER TABLE users ADD COLUMN district VARCHAR(80) NULL"
)

# Migration 009 — territory selection config column on form_templates
_ADD_TERRITORY_COLUMN = text(
    "ALTER TABLE form_templates "
    "ADD COLUMN territory JSON NULL "
    "COMMENT 'State/district/taluka/village IDs selected by this team lead'"
)

# Migration 008 — ensure team_lead role has the manage_roles permission
_SEED_TEAM_LEAD_PERMISSIONS = text("""
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.name IN (
        'view_farmers','create_farmer','edit_farmer','view_visits','create_visit',
        'view_plans','approve_plan','view_reports','export_reports',
        'view_settings','edit_settings','manage_users','manage_roles'
    )
    WHERE r.name IN ('team_lead', 'supervisor')
""")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging
    _log = logging.getLogger(__name__)

    # Best-effort schema patches — non-fatal if DB isn't ready at boot time.
    # Running 'alembic upgrade head' is the canonical fix; these are fallbacks.
    for stmt, label in [
        (_CREATE_FARMER_PHOTOS,        "farmer_photos table"),
        (_ADD_MANAGER_USER_ID,         "users.manager_user_id column"),
        (_FIX_MANAGER_USER_ID_TYPE,    "users.manager_user_id type fix"),
        (_ADD_IS_DRAFT,                "farmers.is_draft column"),
        (_ADD_REVIEW_STATUS,           "farmers.review_status column"),
        (_ADD_REJECTION_REASON,        "farmers.rejection_reason column"),
        (_ADD_REJECTED_BY,             "farmers.rejected_by_user_id column"),
        (_ADD_CUSTOM_FIELDS,           "farmers.custom_fields column"),
        (_CREATE_FORM_TEMPLATES,       "form_templates table"),
        (_ADD_TERRITORY_COLUMN,        "form_templates.territory column"),
        (_ADD_USER_TERRITORY,          "users.territory column"),
        (_ADD_USER_DISTRICT,           "users.district column"),
        (_SEED_TEAM_LEAD_PERMISSIONS,  "team_lead manage_roles permission"),
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(stmt)
        except Exception as exc:
            _log.warning("Auto-migration skipped for %s (%s). Run 'alembic upgrade head'.", label, exc)

    yield
    await engine.dispose()


app = FastAPI(
    title="ProfitPortal API",
    description="Pruthashakti Kisan Kalyan Mission — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handlers ─────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Return a cleaner 422 body — first error message as the detail string."""
    errors = exc.errors()
    first = errors[0] if errors else {}
    field  = " → ".join(str(loc) for loc in first.get("loc", []))
    detail = f"{field}: {first.get('msg', 'Validation error')}" if field else str(first.get("msg"))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail, "errors": errors},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "The requested resource was not found"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Catch-all: ensures ANY unhandled exception returns a JSON 500 instead of
    silently closing the ASGI transport.  Without this, SQLAlchemy/DB errors
    that escape FastAPI's normal handlers close the connection before the HTTP
    response headers are written — the browser then sees "Failed to fetch".
    """
    import logging
    logging.getLogger(__name__).error(
        "Unhandled exception on %s %s: %s", request.method, request.url.path, exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
    )


# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/auth",       tags=["Auth"])
app.include_router(farmers.router,    prefix="/farmers",    tags=["Farmers"])
app.include_router(visits.router,     prefix="/visits",     tags=["Visits"])
app.include_router(plans.router,      prefix="/plans",      tags=["Plans"])
app.include_router(dashboard.router,  prefix="/dashboard",  tags=["Dashboard"])
app.include_router(reports.router,    prefix="/reports",    tags=["Reports"])
app.include_router(admin.router,      prefix="/admin",      tags=["Admin"])
app.include_router(geography.router,  prefix="/geography",  tags=["Geography"])
app.include_router(master.router,      prefix="/master",      tags=["Master"])
app.include_router(form_config.router, prefix="/form-config", tags=["Form Config"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "ProfitPortal API"}


# Serve uploaded files — must be mounted after routes so /uploads/* doesn't collide
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
