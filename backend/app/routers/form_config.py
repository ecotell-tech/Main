from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user, require_permission
from app.models.auth import User
from app.schemas.form_config import FormTemplateOut, SectionUpdate
from app.services.form_config_service import FormConfigService, get_form_config_service

router = APIRouter()


@router.get("", response_model=FormTemplateOut)
async def get_form_template(
    service: FormConfigService = Depends(get_form_config_service),
    current_user: User = Depends(get_current_user),
):
    """Return the full form template visible to the current user.

    - Manager  → their own saved template, or the global default.
    - Agronomist → their manager's template, or the global default.
    - Admin    → the global default template.

    The `configured_by_name` field tells agronomists which team lead
    configured the form they are seeing.
    """
    return await service.get_template_for_user(current_user)


@router.put("/{section}", response_model=FormTemplateOut)
async def update_section(
    section: str,
    body: SectionUpdate,
    service: FormConfigService = Depends(get_form_config_service),
    current_user: User = Depends(require_permission("manage_roles")),
):
    """Save one configuration section to the manager's template row.

    section: dropdowns | extendedFields | steps | moduleAccess

    - Manager  → saves to their own template (manager_user_id = user.id).
    - Admin    → saves to the global template (manager_user_id = 0).

    `configured_by_name` is updated automatically from the caller's name.
    Requires manage_roles permission.
    """
    return await service.update_section(section, body.value_json, current_user)
