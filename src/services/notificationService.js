import { apiFetch } from '@services/api';

const SEVERITY_ORDER = { danger: 0, warning: 1, info: 2, success: 3 };

function daysFromNow(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d)) return null;
  return (d - Date.now()) / 86_400_000;
}

function daysSince(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d)) return null;
  return (Date.now() - d) / 86_400_000;
}

export async function getNotifications() {
  const notifs = [];
  const now = new Date();

  // ── 1. Visits ────────────────────────────────────────────────────────────────
  try {
    const data  = await apiFetch('/visits?limit=100&page=1');
    const visits = data.visits ?? [];

    /* Overdue visits */
    const overdue = visits.filter(v => v.status === 'overdue');
    if (overdue.length === 1) {
      const v = overdue[0];
      notifs.push({
        id:   `overdue-${v.id}`,
        type: 'danger',
        icon: 'fas fa-circle-exclamation',
        title: 'Visit Overdue',
        desc:  `Visit for ${v.farmer_name ?? 'a farmer'} is past its scheduled date.`,
        time:  v.scheduled_date ?? null,
      });
    } else if (overdue.length > 1) {
      notifs.push({
        id:   'overdue-multi',
        type: 'danger',
        icon: 'fas fa-circle-exclamation',
        title: `${overdue.length} Visits Overdue`,
        desc:  `${overdue.length} field visits have passed their scheduled dates and need immediate attention.`,
        time:  null,
      });
    }

    /* Due within 3 days */
    const dueSoon = visits.filter(v => {
      if (v.status !== 'scheduled') return false;
      const d = daysFromNow(v.scheduled_date);
      return d !== null && d >= 0 && d <= 3;
    });
    if (dueSoon.length === 1) {
      const v   = dueSoon[0];
      const d   = daysFromNow(v.scheduled_date);
      const lbl = d < 1 ? 'today' : d < 2 ? 'tomorrow' : `in ${Math.ceil(d)} days`;
      notifs.push({
        id:   `due-${v.id}`,
        type: 'warning',
        icon: 'fas fa-clock',
        title: 'Visit Due Soon',
        desc:  `Scheduled visit for ${v.farmer_name ?? 'a farmer'} is due ${lbl}.`,
        time:  v.scheduled_date ?? null,
      });
    } else if (dueSoon.length > 1) {
      notifs.push({
        id:   'due-soon-multi',
        type: 'warning',
        icon: 'fas fa-clock',
        title: `${dueSoon.length} Visits Due This Week`,
        desc:  `${dueSoon.length} field visits are scheduled within the next 3 days.`,
        time:  null,
      });
    }

    /* High pending backlog */
    const pending = visits.filter(v => v.status === 'pending');
    if (pending.length > 5) {
      notifs.push({
        id:   'pending-backlog',
        type: 'info',
        icon: 'fas fa-hourglass-half',
        title: 'High Pending Visit Count',
        desc:  `${pending.length} visits are pending. Follow up to clear the backlog.`,
        time:  null,
      });
    }
  } catch { /* visit API unavailable — skip */ }

  // ── 2. Farmers ───────────────────────────────────────────────────────────────
  try {
    const data    = await apiFetch('/farmers?limit=200&page=1');
    const farmers = data.farmers ?? [];

    /* Below adoption target (score < 40) */
    const below = farmers.filter(f => {
      const s = f.adoption_score ?? f.adoptionScore ?? 100;
      return s < 40;
    });
    if (below.length === 1) {
      notifs.push({
        id:   `below-target-${below[0].id}`,
        type: 'warning',
        icon: 'fas fa-chart-simple',
        title: 'Farmer Below Adoption Target',
        desc:  `${below[0].name} has an adoption score below 40%. Schedule a follow-up visit.`,
        time:  null,
      });
    } else if (below.length > 1) {
      notifs.push({
        id:   'below-target-multi',
        type: 'warning',
        icon: 'fas fa-chart-simple',
        title: `${below.length} Farmers Below Target`,
        desc:  `${below.length} farmers have adoption scores below 40%. Prioritise field visits to improve engagement.`,
        time:  null,
      });
    }

    /* No visit in last 30 days */
    const stale = farmers.filter(f => {
      const ds = daysSince(f.last_visit_date);
      return ds === null || ds > 30;
    });
    if (stale.length > 0 && stale.length <= farmers.length) {
      notifs.push({
        id:   'no-recent-visit',
        type: 'info',
        icon: 'fas fa-user-clock',
        title: stale.length === 1 ? 'Farmer Needs a Visit' : `${stale.length} Farmers Need Visits`,
        desc:  `${stale.length === 1 ? '1 farmer has' : `${stale.length} farmers have`} not received a field visit in the last 30 days.`,
        time:  null,
      });
    }
  } catch { /* farmer API unavailable — skip */ }

  // ── 3. Dashboard stats ───────────────────────────────────────────────────────
  try {
    const stats = await apiFetch('/dashboard/stats');
    if ((stats.completed_this_month ?? 0) === 0 && now.getDate() > 7) {
      notifs.push({
        id:   'no-completions',
        type: 'info',
        icon: 'fas fa-circle-check',
        title: 'No Completed Visits This Month',
        desc:  'No visits have been marked completed yet this month. Update visit statuses after field work.',
        time:  null,
      });
    }
  } catch { /* dashboard API unavailable — skip */ }

  // Sort by severity, then push info to bottom
  notifs.sort((a, b) => (SEVERITY_ORDER[a.type] ?? 9) - (SEVERITY_ORDER[b.type] ?? 9));

  return notifs;
}
