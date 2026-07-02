"""Dashboard KPI service — real DB aggregation queries."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import Depends

from sqlalchemy import case, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.auth import Role, User
from app.models.farmer import Farmer
from app.models.plan import ConsultingPlan, PlanComponentStatus, PlanComponentType
from app.models.visit import Visit

_TITLES = {"dr.", "mr.", "mrs.", "ms.", "prof.", "dr", "mr", "mrs", "ms", "prof"}

def _initials(name: str) -> str:
    parts = [p for p in name.split() if p.lower() not in _TITLES]
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[-1][0]}".upper()
    return (parts[0][:2] if parts else name[:2]).upper()


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self, user_id: int) -> dict:
        today = date.today()
        month_start = date(today.year, today.month, 1)

        assigned_q = select(func.count(Farmer.id)).where(
            Farmer.registered_by_user_id == user_id,
            Farmer.deleted_at.is_(None),
        )
        active_plans_q = select(func.count(ConsultingPlan.id)).where(
            ConsultingPlan.consultant_user_id == user_id,
            ConsultingPlan.status == "active",
            ConsultingPlan.deleted_at.is_(None),
        )
        pending_q = select(func.count(Visit.id)).where(
            Visit.conducted_by_user_id == user_id,
            Visit.status == "pending",
        )
        completed_q = select(func.count(Visit.id)).where(
            Visit.conducted_by_user_id == user_id,
            Visit.status == "completed",
            Visit.visited_date >= month_start,
        )

        assigned_farmers    = (await self.db.execute(assigned_q)).scalar_one()
        active_plans        = (await self.db.execute(active_plans_q)).scalar_one()
        pending_visits      = (await self.db.execute(pending_q)).scalar_one()
        completed_this_month = (await self.db.execute(completed_q)).scalar_one()

        return {
            "assigned_farmers":     assigned_farmers,
            "active_plans":         active_plans,
            "pending_visits":       pending_visits,
            "completed_this_month": completed_this_month,
        }

    async def get_plan_component_summary(self, user_id: int) -> list[dict]:
        q = (
            select(
                PlanComponentType.code,
                PlanComponentType.label,
                func.count(PlanComponentStatus.id).label("total"),
                func.sum(case((PlanComponentStatus.status == "done", 1), else_=0)).label("done"),
                func.sum(case((PlanComponentStatus.status == "pending", 1), else_=0)).label("pending"),
            )
            .join(PlanComponentStatus, PlanComponentStatus.component_type_id == PlanComponentType.id)
            .join(ConsultingPlan, ConsultingPlan.id == PlanComponentStatus.plan_id)
            .where(
                ConsultingPlan.consultant_user_id == user_id,
                ConsultingPlan.deleted_at.is_(None),
            )
            .group_by(PlanComponentType.id, PlanComponentType.code, PlanComponentType.label)
            .order_by(PlanComponentType.display_order)
        )
        rows = (await self.db.execute(q)).all()
        return [
            {
                "code":    r.code,
                "label":   r.label,
                "total":   r.total or 0,
                "done":    int(r.done or 0),
                "pending": int(r.pending or 0),
            }
            for r in rows
        ]

    async def get_activity(self, user_id: int, limit: int = 20) -> list[dict]:
        """Recent visits (completed + pending) for the current user."""
        q = (
            select(
                Visit.id,
                Visit.visit_code,
                Visit.status,
                Visit.visited_date,
                Visit.created_at,
                Farmer.name.label("farmer_name"),
            )
            .join(Farmer, Farmer.id == Visit.farmer_id)
            .where(Visit.conducted_by_user_id == user_id)
            .order_by(Visit.created_at.desc())
            .limit(limit)
        )
        rows = (await self.db.execute(q)).all()
        activities = []
        for r in rows:
            action = "completed visit" if r.status == "completed" else "scheduled visit"
            activities.append(
                {
                    "type":        "visit",
                    "description": f"You {action} with {r.farmer_name}",
                    "entity_id":   r.id,
                    "entity_code": r.visit_code,
                    "timestamp":   r.created_at,
                }
            )
        return activities


    async def get_leadership_stats(self) -> dict:
        today = date.today()

        # ── Scalar KPIs ─────────────────────────────────────────────────────────
        total_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None)
        )
        high_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None),
            Farmer.interest_level == "high",
        )
        pending_followup_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None),
            Farmer.followup_date < today,
        )

        field_roles_q = (
            select(User.status, func.count(User.id).label("cnt"))
            .join(Role, Role.id == User.role_id)
            .where(
                Role.name.in_(["agronomist", "data_entry_operator", "team_lead"]),
                User.deleted_at.is_(None),
            )
            .group_by(User.status)
        )
        users_q = (
            select(User.status, func.count(User.id).label("cnt"))
            .where(User.deleted_at.is_(None))
            .group_by(User.status)
        )

        total_farmers      = (await self.db.execute(total_q)).scalar_one()
        high_potential     = (await self.db.execute(high_q)).scalar_one()
        pending_follow_ups = (await self.db.execute(pending_followup_q)).scalar_one()

        field_counts = {r.status: r.cnt for r in (await self.db.execute(field_roles_q)).all()}
        user_counts  = {r.status: r.cnt for r in (await self.db.execute(users_q)).all()}
        active_reps   = field_counts.get("active", 0)
        inactive_reps = field_counts.get("inactive", 0) + field_counts.get("suspended", 0)
        total_users   = sum(user_counts.values())
        active_users  = user_counts.get("active", 0)

        # ── Conversion funnel ────────────────────────────────────────────────────
        visited_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None),
            Farmer.last_visit_date.is_not(None),
        )
        plan_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None),
            Farmer.plan_status.in_(["active", "completed"]),
        )
        completed_plan_q = select(func.count(Farmer.id)).where(
            Farmer.is_draft == False, Farmer.deleted_at.is_(None),
            Farmer.plan_status == "completed",
        )

        visited_count       = (await self.db.execute(visited_q)).scalar_one()
        plan_assigned_count = (await self.db.execute(plan_q)).scalar_one()
        converted_count     = (await self.db.execute(completed_plan_q)).scalar_one()
        base = total_farmers or 1

        funnel = [
            {"stage": "Farmers Identified",       "count": total_farmers,      "pct": 100,                                        "note": "Total registered farmers"},
            {"stage": "Visit Completed",           "count": visited_count,      "pct": round(visited_count      / base * 100),     "note": "Farmers with at least one visit"},
            {"stage": "Plan Assigned",             "count": plan_assigned_count,"pct": round(plan_assigned_count/ base * 100),     "note": "Active or completed consulting plan"},
            {"stage": "High Adoption (Score≥70)",  "count": high_potential,     "pct": round(high_potential     / base * 100),     "note": "Interest level: High"},
            {"stage": "Converted",                 "count": converted_count,    "pct": round(converted_count    / base * 100),     "note": "Consulting plan completed"},
        ]

        # ── Adoption readiness bands ─────────────────────────────────────────────
        adoption_q = (
            select(Farmer.interest_level, func.count(Farmer.id).label("cnt"))
            .where(Farmer.is_draft == False, Farmer.deleted_at.is_(None), Farmer.interest_level.is_not(None))
            .group_by(Farmer.interest_level)
        )
        adoption_rows = {r.interest_level: r.cnt for r in (await self.db.execute(adoption_q)).all()}

        # ── Weekly capture trend (last 5 ISO weeks) ──────────────────────────────
        five_weeks_ago = today - timedelta(weeks=5)
        weekly_q = (
            select(
                func.yearweek(Farmer.created_at, 1).label("yw"),
                func.count(Farmer.id).label("cnt"),
            )
            .where(
                Farmer.is_draft == False, Farmer.deleted_at.is_(None),
                Farmer.created_at >= five_weeks_ago,
            )
            .group_by(text("yw"))
            .order_by(text("yw"))
        )
        weekly_rows = (await self.db.execute(weekly_q)).all()

        def _yw_label(yw: int) -> str:
            year, week = divmod(yw, 100)
            d = date.fromisocalendar(year, week, 1)
            return f"W{week} {d.strftime('%b')}"

        weekly_capture = [{"week": _yw_label(r.yw), "captured": r.cnt} for r in weekly_rows]

        # ── Rep productivity ─────────────────────────────────────────────────────
        farmer_sub = (
            select(
                Farmer.registered_by_user_id.label("uid"),
                func.count(Farmer.id).label("captured"),
                func.max(Farmer.created_at).label("last_reg"),
            )
            .where(Farmer.is_draft == False, Farmer.deleted_at.is_(None))
            .group_by(Farmer.registered_by_user_id)
            .subquery()
        )
        visit_sub = (
            select(
                Visit.conducted_by_user_id.label("uid"),
                func.sum(case((Visit.status == "pending", 1), else_=0)).label("pending"),
                func.max(Visit.created_at).label("last_visit"),
            )
            .group_by(Visit.conducted_by_user_id)
            .subquery()
        )
        reps_q = (
            select(
                User.id, User.name, User.mobile, User.territory, User.district, User.status,
                Role.name.label("role"),
                func.coalesce(farmer_sub.c.captured, 0).label("farmers_captured"),
                func.coalesce(visit_sub.c.pending, 0).label("pending_visits"),
                func.greatest(
                    func.coalesce(farmer_sub.c.last_reg,  datetime(2000, 1, 1)),
                    func.coalesce(visit_sub.c.last_visit, datetime(2000, 1, 1)),
                ).label("last_active"),
            )
            .join(Role, Role.id == User.role_id)
            .outerjoin(farmer_sub, farmer_sub.c.uid == User.id)
            .outerjoin(visit_sub,  visit_sub.c.uid  == User.id)
            .where(
                Role.name.in_(["agronomist", "data_entry_operator", "team_lead"]),
                User.deleted_at.is_(None),
            )
            .order_by(func.coalesce(farmer_sub.c.captured, 0).desc())
        )
        rep_rows = (await self.db.execute(reps_q)).all()

        def _last_active_label(dt) -> str | None:
            if not dt:
                return None
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("T", " ").split(".")[0])
                except ValueError:
                    return None
            d = dt.date() if hasattr(dt, "date") else dt
            if d.year == 2000:
                return None
            delta = (today - d).days
            if delta == 0:   return "Today"
            if delta == 1:   return "Yesterday"
            if delta <= 7:   return f"{delta} days ago"
            if delta <= 14:  return "1 week ago"
            return d.strftime("%d %b %Y")

        rep_productivity = [
            {
                "id":               r.id,
                "name":             r.name,
                "initials":         _initials(r.name),
                "mobile":           r.mobile,
                "role":             r.role,
                "territory":        r.territory,
                "district":         r.district,
                "farmers_captured": int(r.farmers_captured),
                "pending_visits":   int(r.pending_visits),
                "last_active":      _last_active_label(r.last_active),
                "status":           r.status,
            }
            for r in rep_rows
        ]

        # ── Users by role ────────────────────────────────────────────────────────
        role_cnt_q = (
            select(Role.name.label("rn"), func.count(User.id).label("cnt"))
            .join(Role, Role.id == User.role_id)
            .where(User.deleted_at.is_(None))
            .group_by(Role.name)
        )
        users_by_role = {r.rn: r.cnt for r in (await self.db.execute(role_cnt_q)).all()}

        # ── Risk indicators ──────────────────────────────────────────────────────
        risks = []
        if inactive_reps > 0:
            noun = "representative" if inactive_reps == 1 else "representatives"
            risks.append({"id": "r_inactive", "text": f"{inactive_reps} {noun} currently inactive", "level": "danger", "action": "View Team"})

        if pending_follow_ups > 0:
            risks.append({"id": "r_followup", "text": f"{pending_follow_ups} follow-up{'s' if pending_follow_ups != 1 else ''} overdue", "level": "danger" if pending_follow_ups >= 5 else "warning", "action": "View Farmers"})

        low_reps = [r for r in rep_productivity if r["farmers_captured"] > 0 and r["pending_visits"] > 8]
        for r in low_reps[:2]:
            risks.append({"id": f"r_low_{r['id']}", "text": f"{r['name']} has {r['pending_visits']} pending visits", "level": "warning", "action": "View Report"})

        no_activity_reps = [r for r in rep_productivity if r["last_active"] is None and r["status"] == "active"]
        for r in no_activity_reps[:2]:
            risks.append({"id": f"r_idle_{r['id']}", "text": f"{r['name']} has no recorded activity yet", "level": "warning", "action": "View Team"})

        if not risks:
            risks.append({"id": "r_ok", "text": "No critical risks detected — all indicators normal", "level": "ok", "action": None})

        return {
            "total_farmers":      total_farmers,
            "high_potential":     high_potential,
            "pending_follow_ups": pending_follow_ups,
            "active_reps":        active_reps,
            "inactive_reps":      inactive_reps,
            "total_users":        total_users,
            "active_users":       active_users,
            "conversion_funnel":  funnel,
            "adoption_high":      adoption_rows.get("high",   0),
            "adoption_medium":    adoption_rows.get("medium", 0),
            "adoption_low":       adoption_rows.get("low",    0),
            "weekly_capture":     weekly_capture,
            "rep_productivity":   rep_productivity,
            "risks":              risks,
            "users_by_role":      users_by_role,
        }

    async def get_rep_performance(self) -> list[dict]:
        today = date.today()
        month_start = date(today.year, today.month, 1)
        week_start  = today - timedelta(days=today.weekday())

        visit_sub = (
            select(
                Visit.conducted_by_user_id.label("uid"),
                func.count(Visit.id).label("total_visits"),
                func.sum(case((Visit.visited_date == today, 1), else_=0)).label("v_today"),
                func.sum(case((Visit.visited_date >= week_start,  1), else_=0)).label("v_week"),
                func.sum(case((Visit.visited_date >= month_start, 1), else_=0)).label("v_month"),
            )
            .where(Visit.status == "completed")
            .group_by(Visit.conducted_by_user_id)
            .subquery()
        )
        farmer_sub = (
            select(
                Farmer.registered_by_user_id.label("uid"),
                func.count(Farmer.id).label("captured"),
                func.coalesce(func.round(func.avg(Farmer.adoption_score)), 0).label("avg_score"),
                func.sum(case((Farmer.plan_status == "completed", 1), else_=0)).label("converted"),
            )
            .where(Farmer.is_draft == False, Farmer.deleted_at.is_(None))
            .group_by(Farmer.registered_by_user_id)
            .subquery()
        )
        q = (
            select(
                User.id, User.name, User.territory, User.status,
                Role.name.label("role"),
                func.coalesce(visit_sub.c.total_visits, 0).label("total_visits"),
                func.coalesce(visit_sub.c.v_today,     0).label("v_today"),
                func.coalesce(visit_sub.c.v_week,      0).label("v_week"),
                func.coalesce(visit_sub.c.v_month,     0).label("v_month"),
                func.coalesce(farmer_sub.c.avg_score,  0).label("avg_score"),
                func.coalesce(farmer_sub.c.converted,  0).label("converted"),
                func.coalesce(farmer_sub.c.captured,   0).label("farmers_captured"),
            )
            .join(Role, Role.id == User.role_id)
            .outerjoin(visit_sub,  visit_sub.c.uid  == User.id)
            .outerjoin(farmer_sub, farmer_sub.c.uid == User.id)
            .where(
                Role.name.in_(["agronomist", "data_entry_operator", "team_lead"]),
                User.deleted_at.is_(None),
            )
            .order_by(func.coalesce(visit_sub.c.v_week, 0).desc())
        )
        rows = (await self.db.execute(q)).all()
        return [
            {
                "id":               r.id,
                "repName":          r.name,
                "role":             r.role,
                "territory":        r.territory or "—",
                "status":           r.status,
                "today":            int(r.v_today),
                "thisWeek":         int(r.v_week),
                "thisMonth":        int(r.v_month),
                "totalVisits":      int(r.total_visits),
                "avgScore":         int(r.avg_score or 0),
                "converted":        int(r.converted),
                "farmers_captured": int(r.farmers_captured),
            }
            for r in rows
        ]

    async def get_all_activity(self, limit: int = 50) -> list[dict]:
        _ROLE_LABELS = {
            "agronomist":          "Representative",
            "data_entry_operator": "Data Entry",
            "team_lead":           "Team Lead",
            "admin":               "Admin",
            "manager":             "Manager",
        }
        q = (
            select(
                Visit.id,
                Visit.status,
                Visit.visited_date,
                Visit.created_at,
                User.name.label("actor"),
                Role.name.label("actor_role"),
                Farmer.name.label("farmer_name"),
            )
            .join(User,   User.id   == Visit.conducted_by_user_id)
            .join(Role,   Role.id   == User.role_id)
            .join(Farmer, Farmer.id == Visit.farmer_id)
            .order_by(Visit.created_at.desc())
            .limit(limit)
        )
        rows = (await self.db.execute(q)).all()
        result = []
        for r in rows:
            action = (
                "Completed Visit" if r.status == "completed" else
                "Cancelled Visit" if r.status == "cancelled" else
                "Overdue Visit"   if r.status == "overdue"   else
                "Scheduled Visit"
            )
            ok = r.status in ("completed", "pending")
            dt = r.created_at
            result.append({
                "id":       r.id,
                "actor":    r.actor,
                "role":     _ROLE_LABELS.get(r.actor_role, r.actor_role),
                "initials": _initials(r.actor),
                "action":   action,
                "target":   f"Farmer: {r.farmer_name}",
                "date":     dt.strftime("%d %b %Y") if dt else "—",
                "time":     dt.strftime("%I:%M %p")  if dt else "—",
                "status":   "success" if ok else "failed",
            })
        return result


def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)
