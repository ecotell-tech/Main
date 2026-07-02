from __future__ import annotations

from typing import Optional

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crud import BaseRepository
from app.core.exceptions import bad_request
from app.database import get_db
from app.models.auth import User
from app.models.form_template import FormTemplate

# Sentinel: manager_user_id == 0 means "global / system default"
GLOBAL_MANAGER_ID = 0

# Map the URL section key to the FormTemplate column name
SECTION_COLUMNS: dict[str, str] = {
    "dropdowns":      "dropdowns",
    "extendedFields": "extended_fields",
    "steps":          "steps",
    "moduleAccess":   "module_access",
    "territory":      "territory",
}


# ── Repository ────────────────────────────────────────────────

class FormTemplateRepository(BaseRepository[FormTemplate]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(FormTemplate, db)

    async def get_by_manager(self, manager_user_id: int) -> Optional[FormTemplate]:
        result = await self.db.execute(
            select(FormTemplate).where(
                FormTemplate.manager_user_id == manager_user_id
            )
        )
        return result.scalar_one_or_none()


# ── Service ───────────────────────────────────────────────────

class FormConfigService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = FormTemplateRepository(db)

    def _resolve_manager_id(self, user: User) -> int:
        """Return the manager_user_id to scope reads to for this user.

        Hierarchy: Leadership (manager) → Manager (admin) → Team Lead (team_lead)
                   → Agronomist / DEO

        - Leadership / Team Lead: own row (user.id).
        - Admin (Manager): global row (0) — they write and read org-wide defaults.
        - Agronomist / DEO: their team lead's row (manager_user_id), fall back to global.
        """
        role_name = user.role.name if user.role else ""
        if role_name in ("manager", "team_lead", "supervisor"):
            return user.id
        if role_name == "admin":
            return GLOBAL_MANAGER_ID
        return user.manager_user_id or GLOBAL_MANAGER_ID

    async def get_template_for_user(self, user: User) -> FormTemplate:
        """Return the best-match FormTemplate for this user.

        Priority: per-manager row → global row → empty in-memory default.
        """
        manager_id = self._resolve_manager_id(user)

        if manager_id != GLOBAL_MANAGER_ID:
            tmpl = await self.repo.get_by_manager(manager_id)
            if tmpl:
                return tmpl

        global_tmpl = await self.repo.get_by_manager(GLOBAL_MANAGER_ID)
        if global_tmpl:
            return global_tmpl

        # Nothing saved yet — return a detached empty object; frontend uses defaults.
        return FormTemplate(manager_user_id=GLOBAL_MANAGER_ID, configured_by_name="")

    async def update_section(
        self,
        section: str,
        value_json,
        user: User,
    ) -> FormTemplate:
        """Upsert one config section on the manager's template row.

        Managers write to their own row (manager_user_id = user.id).
        Admins write to the global row (manager_user_id = 0).
        """
        col = SECTION_COLUMNS.get(section)
        if col is None:
            raise bad_request(
                f"Unknown section '{section}'. "
                f"Valid: {', '.join(SECTION_COLUMNS)}"
            )

        role_name = user.role.name if user.role else ""
        # Team Lead writes to their own row so their agronomists/DEOs can read it.
        # Admin writes to global (GLOBAL_MANAGER_ID=0) as org-wide defaults.
        manager_user_id = (
            user.id if role_name in ("manager", "team_lead", "supervisor")
            else GLOBAL_MANAGER_ID
        )

        existing = await self.repo.get_by_manager(manager_user_id)
        if existing:
            return await self.repo.update(
                existing,
                configured_by_name=user.name,
                configured_by_user_id=user.id,
                **{col: value_json},
            )

        obj = await self.repo.create(
            manager_user_id=manager_user_id,
            configured_by_name=user.name,
            configured_by_user_id=user.id,
            **{col: value_json},
        )
        return await self.repo.save(obj)


def get_form_config_service(
    db: AsyncSession = Depends(get_db),
) -> FormConfigService:
    return FormConfigService(db)
