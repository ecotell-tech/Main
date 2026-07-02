import { useState, useEffect, useMemo } from 'react';
import { useNavigate }          from 'react-router-dom';
import { useRoleTheme }         from '@hooks/useRoleTheme';
import { useAuth }              from '@context/AuthContext';
import { usePermissions }       from '@context/PermissionsContext';
import RoleHeroBanner           from '@common/RoleHeroBanner/RoleHeroBanner';
import Card                     from '@common/Card/Card';
import Badge                    from '@common/Badge/Badge';
import ProgressBar              from '@common/ProgressBar/ProgressBar';
import Button                   from '@common/Button/Button';
import Avatar                   from '@common/Avatar/Avatar';
import VisitLogModal            from '@features/modals/VisitLogModal/VisitLogModal';
import { getDashboardStats, getPlanComponentSummary, getActivityFeed } from '@services/dashboardService';
import { getFarmers }           from '@services/farmerService';
import { ROUTES }               from '@constants/routes';
import { PERMISSIONS }          from '@constants/roles';

const PLAN_STATUS_VARIANT_MAP = { active: 'success', pending: 'warning', completed: 'info' };
const DOT_COLORS = { green: '#16a34a', blue: '#2563eb', amber: '#d97706', red: '#ef4444' };

// Icon + color mapping for plan component codes returned by the API
const COMPONENT_META = {
  irrigation: { icon: 'fas fa-tint',      color: '#2563eb' },
  fertilizer: { icon: 'fas fa-seedling',  color: '#16a34a' },
  spray:      { icon: 'fas fa-spray-can', color: '#d97706' },
  advisory:   { icon: 'fas fa-leaf',      color: '#92400e' },
};

function formatActivityTime(isoTimestamp) {
  const ts = new Date(isoTimestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (ts.toDateString() === today.toDateString()) return `Today, ${timeStr}`;
  if (ts.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
  return ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AgronomistDashboard() {
  const theme    = useRoleTheme();
  const navigate = useNavigate();
  const { currentUser }        = useAuth();
  const { getRolePermissions } = usePermissions();
  const userPerms = getRolePermissions(currentUser?.role ?? '');

  const [stats,          setStats]          = useState({ assigned_farmers: 0, active_plans: 0, pending_visits: 0, completed_this_month: 0 });
  const [planComponents, setPlanComponents] = useState([]);
  const [activity,       setActivity]       = useState([]);
  const [recentFarmers,  setRecentFarmers]  = useState([]);
  const [visitModal,     setVisitModal]     = useState(false);

  useEffect(() => {
    Promise.allSettled([
      getDashboardStats(),
      getPlanComponentSummary(),
      getActivityFeed(6),
      getFarmers({ page: 1, limit: 15 }),
    ]).then(([s, pc, act, farmersRes]) => {
      if (s.status         === 'fulfilled') setStats(s.value);
      if (pc.status        === 'fulfilled') setPlanComponents(pc.value);
      if (act.status       === 'fulfilled') setActivity(act.value);
      if (farmersRes.status === 'fulfilled') setRecentFarmers(farmersRes.value.farmers ?? []);
    });
  }, []);

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="My Consulting Dashboard"
        subtitle="Field visits, farmer plans, and adoption progress for your assigned territory"
        stats={[
          { label: 'Farmers', value: stats.assigned_farmers },
          { label: 'Pending Visits', value: stats.pending_visits },
          { label: 'Plans Active', value: stats.active_plans },
        ]}
      />

      {/* Quick-action strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label:      'Log a Visit',
            sub:        stats.pending_visits > 0 ? `${stats.pending_visits} pending` : 'Record a field visit',
            icon:       'fas fa-calendar-plus',
            iconBg:     '#dcfce7',
            iconColor:  '#16a34a',
            borderClr:  '#86efac',
            badge:      stats.pending_visits > 0 ? { text: stats.pending_visits, color: '#16a34a' } : null,
            action:     () => setVisitModal(true),
            show:       userPerms.has(PERMISSIONS.CREATE_VISIT),
          },
          {
            label:      'Register Farmer',
            sub:        'Add a new farmer profile',
            icon:       'fas fa-user-plus',
            iconBg:     '#d1fae5',
            iconColor:  '#059669',
            borderClr:  '#6ee7b7',
            badge:      null,
            action:     () => navigate(ROUTES.abs.registerFarmer),
            show:       userPerms.has(PERMISSIONS.CREATE_FARMER),
          },
          {
            label:      'View My Farmers',
            sub:        stats.assigned_farmers > 0 ? `${stats.assigned_farmers} assigned` : 'Browse your list',
            icon:       'fas fa-users',
            iconBg:     '#ccfbf1',
            iconColor:  '#0d9488',
            borderClr:  '#5eead4',
            badge:      stats.assigned_farmers > 0 ? { text: stats.assigned_farmers, color: '#0d9488' } : null,
            action:     () => navigate(ROUTES.abs.farmers),
            show:       userPerms.has(PERMISSIONS.VIEW_FARMERS),
          },
          {
            label:      'Generate Report',
            sub:        stats.completed_this_month > 0 ? `${stats.completed_this_month} completed this month` : 'View analytics',
            icon:       'fas fa-chart-bar',
            iconBg:     '#ecfccb',
            iconColor:  '#65a30d',
            borderClr:  '#bef264',
            badge:      null,
            action:     () => navigate(ROUTES.abs.reports),
            show:       userPerms.has(PERMISSIONS.VIEW_REPORTS),
          },
        ].filter(c => c.show).map(({ label, sub, icon, iconBg, iconColor, borderClr, badge, action }) => (
          <button
            key={label}
            onClick={action}
            className="group relative flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left transition-all hover:shadow-elevated active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ borderColor: borderClr }}
          >
            {/* Live badge */}
            {badge && (
              <span
                className="absolute top-3 right-3 text-[0.6rem] font-bold text-white rounded-full px-1.5 py-0.5 leading-none"
                style={{ background: badge.color }}
              >
                {badge.text > 99 ? '99+' : badge.text}
              </span>
            )}

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: iconBg }}
            >
              <i className={`${icon} text-base`} style={{ color: iconColor }} aria-hidden="true" />
            </div>

            {/* Text */}
            <div>
              <div className="text-sm font-bold text-foreground leading-snug">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{sub}</div>
            </div>

            {/* Arrow hint */}
            <i
              className="fas fa-arrow-right absolute bottom-4 right-4 text-[0.6rem] opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: iconColor }}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      {/* Log Visit modal (opened from quick-action card) */}
      <VisitLogModal
        isOpen={visitModal}
        onClose={() => setVisitModal(false)}
        onSave={() => {
          setVisitModal(false);
          getDashboardStats().then(s => setStats(s)).catch(() => {});
        }}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-users',           value: stats.assigned_farmers,     label: 'Assigned Farmers',     color: theme.accent },
          { icon: 'fas fa-clipboard-check', value: stats.active_plans,         label: 'Active Plans',         color: '#2563eb' },
          { icon: 'fas fa-calendar-alt',    value: stats.pending_visits,       label: 'Pending Visits',       color: '#d97706' },
          { icon: 'fas fa-check-circle',    value: stats.completed_this_month, label: 'Completed This Month', color: '#0d9488' },
        ].map(({ icon, value, label, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4 hover:shadow-elevated transition-shadow"
            style={{ borderTopWidth: 2, borderTopColor: color }}
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: `${color}18` }}>
              <i className={`${icon} text-base`} style={{ color }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[1.6rem] font-extrabold text-foreground leading-none">{value}</div>
              <div className="text-[0.75rem] font-medium text-muted-foreground mt-1 truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Farmers + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Farmers — 2/3 width */}
        <div className="xl:col-span-2">
          <Card>
            <Card.Header title="Recent Farmers" icon="fas fa-users" iconStyle={{ color: theme.accent }}>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.FARMERS)}>View All</Button>
            </Card.Header>
            <Card.Body className="p-0">
              {recentFarmers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No farmers assigned yet.</p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-border">
                    {recentFarmers.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={f.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{f.name}</div>
                          <div className="text-[0.65rem] text-muted-foreground">{f.crop} · {f.village}</div>
                        </div>
                        <Badge variant={PLAN_STATUS_VARIANT_MAP[f.planStatus] ?? 'info'}>{f.planStatus}</Badge>
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Farmer', 'Crop', 'Location', 'Score', 'Plan', ''].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentFarmers.map((f) => (
                          <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={f.name} size="sm" />
                                <div>
                                  <div className="text-xs font-semibold">{f.name}</div>
                                  <div className="text-[0.65rem] text-muted-foreground">{f.mobile}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">{f.crop}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{f.village}, {f.district}</td>
                            <td className="px-4 py-3">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: f.adoptionScore >= 70 ? '#dcfce7' : f.adoptionScore >= 40 ? '#fef3c7' : '#f3f4f6',
                                  color:      f.adoptionScore >= 70 ? '#14532d' : f.adoptionScore >= 40 ? '#78350f' : '#374151',
                                }}
                              >
                                {f.adoptionScore}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={PLAN_STATUS_VARIANT_MAP[f.planStatus] ?? 'info'}>{f.planStatus}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/app/farmers/${f.id}`)}>View</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* Activity Timeline — 1/3 width */}
        <div>
          <Card>
            <Card.Header title="Recent Activity" icon="fas fa-history" iconStyle={{ color: theme.accent }} />
            <Card.Body>
              {activity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 6).map((a) => {
                    const isCompleted = a.description?.includes('completed');
                    const dot = isCompleted ? 'green' : 'blue';
                    return (
                      <div key={a.entity_id} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: DOT_COLORS[dot] }} />
                          <div className="flex-1 w-px bg-border mt-1" />
                        </div>
                        <div className="pb-3 min-w-0">
                          <div className="text-[0.68rem] text-muted-foreground">{formatActivityTime(a.timestamp)}</div>
                          <div className="text-xs font-medium text-foreground mt-0.5">{a.description}</div>
                          {a.entity_code && (
                            <div className="text-[0.68rem] text-muted-foreground mt-0.5">{a.entity_code}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Plan Component Summary */}
      <Card>
        <Card.Header title="Consulting Plan Components" icon="fas fa-tasks" iconStyle={{ color: theme.accent }}>
          <Badge variant="success">This Month</Badge>
        </Card.Header>
        <Card.Body>
          {planComponents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No plan components data yet.</p>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
              {planComponents.map((pc) => {
                const meta = COMPONENT_META[pc.code] ?? { icon: 'fas fa-tasks', color: theme.accent };
                const pct = pc.total > 0 ? Math.round((pc.done / pc.total) * 100) : 0;
                return (
                  <div key={pc.code} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: meta.color }}>
                        <i className={meta.icon} aria-hidden="true" /> {pc.label}
                      </span>
                      <span className="text-xs font-bold text-foreground">{pc.done}/{pc.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                    <div className="text-[0.68rem] text-muted-foreground">{pct}% complete</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
