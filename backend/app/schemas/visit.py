from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class VisitTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    name:        str
    description: Optional[str] = None


class VisitCreate(BaseModel):
    farmer_id:      int
    visit_type_id:  int
    scheduled_date: Optional[date] = None
    location:       Optional[str]  = None
    notes:          Optional[str]  = None
    related_plan_id: Optional[int] = None


class VisitUpdate(BaseModel):
    status:         Optional[str]  = None
    visited_date:   Optional[date] = None
    scheduled_date: Optional[date] = None
    location:       Optional[str]  = None
    notes:          Optional[str]  = None


class VisitSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:             int
    visit_code:     str
    farmer_id:      int
    farmer_name:    Optional[str] = None
    visit_type_id:  int
    visit_type_name: Optional[str] = None
    status:         str
    scheduled_date: Optional[date] = None
    visited_date:   Optional[date] = None
    location:       Optional[str]  = None
    created_at:     datetime


class VisitDetail(VisitSummary):
    conducted_by_user_id: int
    conducted_by_name:    Optional[str] = None
    related_plan_id:      Optional[int] = None
    notes:                Optional[str] = None


class VisitListResponse(BaseModel):
    visits: list[VisitSummary]
    total:  int
    page:   int
    limit:  int
    pages:  int
