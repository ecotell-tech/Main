# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ProfitPortal** (Pruthashakti Kisan Kalyan Mission) is a multi-role agritech platform for farmer welfare management. Field representatives (agronomists) register farmers, log visits, and create consulting plans. Managers and supervisors view KPIs and reports.

**Roles:** `agronomist`, `supervisor`, `admin`, `data_entry_operator`, `manager`

---

## Development Commands

### Full stack (recommended)
```bash
docker compose up          # Start MySQL + Redis + FastAPI + Vite
docker compose up --build  # Rebuild images first
docker compose down        # Stop all services
```

### Frontend only
```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # Production build → dist/
npm run lint      # ESLint (0 warnings allowed)
```

### Backend only
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Database migrations (run inside backend container or with DB accessible)
```bash
cd backend
alembic upgrade head          # Apply all pending migrations
alembic revision --autogenerate -m "description"  # Generate new migration
alembic downgrade -1          # Roll back one migration
```

---

## Architecture

### Frontend (`src/`)

**Routing is centralized** — `src/constants/routeRegistry.js` is the single source of truth for every screen. Adding a new screen requires only: (1) adding a `ROUTES` key in `src/constants/routes.js`, (2) adding an entry to `ROUTE_REGISTRY` in `routeRegistry.js`. `App.jsx` auto-maps the registry to `<Route>` elements with `ProtectedRoute` wrappers — no manual route additions elsewhere.

**Path aliases** (configured in `vite.config.js`):
- `@features` → `src/components/features/`
- `@services` → `src/services/`
- `@constants` → `src/constants/`
- `@data` → `src/data/`
- `@hooks`, `@context`, `@common`, `@layout`, `@ui`, `@lib`

**Service layer pattern** — All HTTP calls go through `src/services/api.js → apiFetch()`. It handles JWT attachment (from `sessionStorage`), 401 auto-logout, and CSRF tokens. Feature services (`farmerService.js`, `visitService.js`, etc.) call `apiFetch` and normalize snake_case API responses to camelCase.

**Mock mode** — Several services still return mock data from `src/data/mock/` instead of calling the API. The pattern to switch any service to real API:
```js
// Before (mock):
import MOCK_DATA from '@data/mock/foo.json';
export async function getData() { return MOCK_DATA; }

// After (real API):
import { apiFetch } from '@services/api';
export async function getData() { return apiFetch('/foo'); }
```

**Auth state** — `src/context/AuthContext.jsx` stores the current user in `sessionStorage` (tab-scoped). Managers can impersonate other roles via a localStorage handshake (`PENDING_IMPERSONATE_KEY`). Permissions are checked via `src/context/PermissionsContext.jsx` using `ROLE_PERMISSIONS` from `src/constants/roles.js`.

**Theming** — Each role has a distinct color scheme defined in `src/constants/roleTheme.js`. The `useRoleTheme()` hook applies CSS variables at runtime.

### Backend (`backend/app/`)

**Request lifecycle:** Router → Service → Repository (BaseRepository) → SQLAlchemy async session → MySQL

**`BaseRepository`** (`app/core/crud.py`) provides generic async CRUD for every model: `get`, `get_or_404`, `paginate`, `create`, `update`, `soft_delete`. Subclass it per model:
```python
class VisitRepository(BaseRepository[Visit]):
    def __init__(self, db: AsyncSession):
        super().__init__(Visit, db)
```
`_base_q()` automatically filters out soft-deleted rows (models with `deleted_at`).

**Auth dependencies** (`app/dependencies/auth.py`):
- `get_current_user` — validates JWT, loads user+role+permissions eagerly
- `require_permission("permission_key")` — factory returning a dependency that enforces RBAC

**Pagination** — inject `Depends(page_params)` to get a `PageParams` object with `.page`, `.limit`, `.offset`. Call `repo.paginate(query, params)` → `(rows, total)`.

**Exception factories** (`app/core/exceptions.py`) — use `raise not_found(...)`, `raise conflict(...)`, etc. instead of raw `HTTPException`.

**Model mixins** (`app/models/base.py`):
- `TimestampMixin` — adds `created_at`, `updated_at`
- `SoftDeleteMixin(TimestampMixin)` — adds `deleted_at`; `BaseRepository._base_q()` auto-filters these rows

**Settings** — all config via `app/config.py` (pydantic-settings), reads from `backend/.env`. Key vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGINS`.

### Database

MySQL 8.0. Schema in `database/schema.sql` (initial seed). Alembic migrations in `backend/alembic/versions/`. The async driver is `aiomysql`; connection URL format: `mysql+aiomysql://user:pass@host:port/db`.

---

## What Is Not Yet Wired to the Backend

These frontend features use mock data and need real API integration:

| Feature | Files | Status |
|---|---|---|
| Visit Log list | `src/components/features/visitLog/VisitLogPage/` | `visitService.getVisits()` returns mock JSON |
| Log Visit modal | `src/components/features/modals/VisitLogModal/` | Submit handler shows toast only, no API call |
| Saved Drafts | `src/components/features/agronomist/DraftListPage/` | Hardcoded state, no persistence |
| Dashboard stats | `src/components/features/dashboard/` | Check `dashboardService.js` for mock usage |
| Reports | `src/components/features/reports/` | Check `reportService.js` for mock usage |
| Admin pages | `src/components/features/admin/` | Multiple pages — verify per page |
| Manager pages | `src/components/features/manager/` | Multiple pages — verify per page |

To audit any service: look for `import ... from '@data/mock/'` and commented-out `apiFetch` calls.

---

## Adding a New Feature End-to-End

**Backend:**
1. Model in `app/models/` (inherit mixins from `app/models/base.py`)
2. Schema in `app/schemas/` (Pydantic request/response)
3. Repository subclassing `BaseRepository`
4. Service with business logic
5. Router with `Depends(get_current_user)` or `Depends(require_permission(...))`
6. Include router in `app/main.py`
7. Alembic migration: `alembic revision --autogenerate -m "add_X_table"`

**Frontend:**
1. Service function in `src/services/` calling `apiFetch`
2. Page component in `src/components/features/<role>/`
3. Register in `src/constants/routes.js` + `src/constants/routeRegistry.js`

**Adding a new role:**
1. Add to `ROLES` in `src/constants/roles.js`
2. Define its `ROLE_PERMISSIONS` in the same file
3. Add routes to `ROUTE_REGISTRY` in `routeRegistry.js` with the new role
4. Add demo credentials to `.env` (`VITE_DEMO_<ROLE>_MOBILE`, etc.)
