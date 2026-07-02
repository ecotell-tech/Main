from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PlanComponentTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:            int
    code:          str
    label:         str
    icon_class:    Optional[str] = None
    display_order: int


class ComponentStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:                int
    component_type_id: int
    component_code:    Optional[str] = None
    component_label:   Optional[str] = None
    status:            str
    completed_at:      Optional[datetime] = None
    notes:             Optional[str]      = None


class ComponentStatusUpdate(BaseModel):
    status: str   # pending | active | done | skipped
    notes:  Optional[str] = None


class PlanCreate(BaseModel):
    farmer_id:          int
    notes:              Optional[str]       = None
    start_date:         Optional[date]      = None
    end_date:           Optional[date]      = None
    component_type_ids: Optional[list[int]] = None   # seed component rows


class PlanUpdate(BaseModel):
    status:         Optional[str]  = None
    overall_status: Optional[str]  = None
    notes:          Optional[str]  = None
    start_date:     Optional[date] = None
    end_date:       Optional[date] = None


class PlanSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             int
    plan_code:      str
    farmer_id:      int
    farmer_name:    Optional[str] = None
    status:         str
    overall_status: str
    start_date:     Optional[date]     = None
    end_date:       Optional[date]     = None
    created_at:     datetime


class PlanDetail(PlanSummary):
    consultant_user_id:  Optional[int] = None
    created_by_user_id:  Optional[int] = None
    approved_by_user_id: Optional[int] = None
    notes:               Optional[str] = None
    components:          list[ComponentStatusOut] = []


class PlanListResponse(BaseModel):
    plans: list[PlanSummary]
    total: int
    page:  int
    limit: int
    pages: int
