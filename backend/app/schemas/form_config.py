from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class FormTemplateOut(BaseModel):
    """Full form template returned to both managers and agronomists."""
    model_config = ConfigDict(from_attributes=True)

    configured_by_name:    str = ""
    configured_by_user_id: Optional[int] = None
    dropdowns:             Optional[Any] = None
    extended_fields:       Optional[Any] = None
    steps:                 Optional[Any] = None
    module_access:         Optional[Any] = None
    territory:             Optional[Any] = None
    updated_at:            Optional[datetime] = None


class SectionUpdate(BaseModel):
    """Body for PUT /form-config/{section} — updates a single config section."""
    value_json: Any
