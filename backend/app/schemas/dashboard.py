from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DashboardStats(BaseModel):
    assigned_farmers:    int
    active_plans:        int
    pending_visits:      int
    completed_this_month: int


class ComponentSummaryItem(BaseModel):
    code:    str
    label:   str
    total:   int
    done:    int
    pending: int


class ActivityEntry(BaseModel):
    type:        str
    description: str
    entity_id:   int
    entity_code: Optional[str] = None
    timestamp:   datetime


# ── Leadership dashboard ──────────────────────────────────────

class RepProductivity(BaseModel):
    id:               int
    name:             str
    initials:         str
    mobile:           str
    role:             str
    territory:        Optional[str] = None
    district:         Optional[str] = None
    farmers_captured: int
    pending_visits:   int
    last_active:      Optional[str] = None
    status:           str


class FunnelStage(BaseModel):
    stage: str
    count: int
    pct:   int
    note:  str


class WeeklyCapture(BaseModel):
    week:     str
    captured: int


class RiskIndicator(BaseModel):
    id:     str
    text:   str
    level:  str   # danger | warning | ok
    action: Optional[str] = None


class LeadershipStats(BaseModel):
    total_farmers:      int
    high_potential:     int
    pending_follow_ups: int
    active_reps:        int
    inactive_reps:      int
    total_users:        int
    active_users:       int
    users_by_role:      dict[str, int] = {}
    conversion_funnel:  list[FunnelStage]
    adoption_high:      int
    adoption_medium:    int
    adoption_low:       int
    weekly_capture:     list[WeeklyCapture]
    rep_productivity:   list[RepProductivity]
    risks:              list[RiskIndicator]


class RepPerformanceStat(BaseModel):
    id:               int
    repName:          str
    role:             str
    territory:        str
    status:           str
    today:            int
    thisWeek:         int
    thisMonth:        int
    totalVisits:      int
    avgScore:         int
    converted:        int
    farmers_captured: int


class CrossRoleActivity(BaseModel):
    id:       int
    actor:    str
    role:     str
    initials: str
    action:   str
    target:   str
    date:     str
    time:     str
    status:   str
