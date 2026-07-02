from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PlanCompletionRow(BaseModel):
    farmer_id:      int
    farmer_code:    str
    farmer_name:    str
    plan_id:        Optional[int] = None
    plan_code:      Optional[str] = None
    plan_status:    Optional[str] = None
    total_components: int
    done_components:  int
    completion_pct: float


class PlanCompletionResponse(BaseModel):
    rows:  list[PlanCompletionRow]
    total: int
    page:  int
    limit: int
    pages: int


class AdoptionScoreRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    farmer_id:      int
    farmer_code:    str
    farmer_name:    str
    adoption_score: Optional[int] = None
    plan_status:    str


class AdoptionScoreResponse(BaseModel):
    rows:  list[AdoptionScoreRow]
    total: int
    page:  int
    limit: int
    pages: int


class RepPerformanceRow(BaseModel):
    rep_id:        int
    rep_name:      str
    rep_mobile:    Optional[str] = None
    total:         int = 0
    pending_review: int = 0
    approved:      int = 0
    rejected:      int = 0
    high:          int = 0
    medium:        int = 0
    low:           int = 0
    avg_score:     Optional[float] = None


class TeamPerformanceResponse(BaseModel):
    reps:           List[RepPerformanceRow]
    total_farmers:  int
    total_pending:  int
    total_approved: int
    total_rejected: int


class TopFarmerRow(BaseModel):
    farmer_id:          int
    farmer_code:        str
    farmer_name:        str
    initials:           Optional[str] = None
    avatar_gradient:    Optional[str] = None
    adoption_score:     Optional[int] = None
    plan_status:        str
    review_status:      str
    village_name:       Optional[str] = None
    district_name:      Optional[str] = None
    primary_crop:       Optional[str] = None
    composite_score:    int
    plan_completion_pct: Optional[float] = None


class TopFarmersResponse(BaseModel):
    farmers: List[TopFarmerRow]
    total:   int
