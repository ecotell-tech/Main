/**
 * ManagerDashboardPage — Leadership / Management Team
 * All data is fetched live from /dashboard/leadership.
 */
import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getTheme }            from '@constants/roleTheme';
import RoleHeroBanner          from '@common/RoleHeroBanner/RoleHeroBanner';
import Card                    from '@common/Card/Card';
import Badge                   from '@common/Badge/Badge';
import Button                  from '@common/Button/Button';
import { ROUTES }              from '@constants/routes';
import { useAuth }             from '@context/AuthContext';
import { getLeadershipStats }  from '@services/dashboardService';
import { getUsers }            from '@services/userService';

const theme = getTheme('manager');

const RISK_STYLE = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: 'fas fa-circle-exclamation' },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: 'fas fa-triangle-exclamation' },
  ok:      { color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: 'fas fa-circle-check' },
};

const TEAM_ROLE_META = {
  admin:               { label: 'Manager',              icon: 'fas fa-user-shield',         color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  team_lead:           { label: 'Team Lead',            icon: 'fas fa-users-between-lines', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  agronomist:          { label: 'Field Representative', icon: 'fas fa-leaf',                color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  data_entry_operator: { label: 'Data Entry Operator',  icon: 'fas fa-keyboard',            color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-muted rounded-lg ${className}`} />;
}

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { impersonateUser } = useAuth();

  const [stats, setStats]   = useState(null);
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([getLeadershipStats(), getUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  function handleViewAs(user) {
    impersonateUser(user);
    navigate('/app/dashboard', { replace: true });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-destructive">
        <i className="fas fa-circle-exclamation mr-2" />{error}
      </div>
    );
  }

  const weekMax = stats ? Math.max(...stats.weekly_capture.map(w => w.captured), 1) : 1;
  const totalAdoption = stats ? (stats.adoption_high + stats.adoption_medium + stats.adoption_low) || 1 : 1;

  const adoptionBands = stats ? [
    { label: 'High (70–100)',  count: stats.adoption_high,   pct: Math.round(stats.adoption_high   / totalAdoption * 100), color: '#16a34a', note: 'Ready for conversion outreach' },
    { label: 'Medium (40–69)',count: stats.adoption_medium, pct: Math.round(stats.adoption_medium / totalAdoption * 100), color: '#d97706', note: 'Needs follow-up and awareness' },
    { label: 'Low (0–39)',    count: stats.adoption_low,    pct: Math.round(stats.adoption_low    / totalAdoption * 100), color: '#ef4444', note: 'Early-stage — long conversion path' },
  ] : [];

  return (
    <div className="space-y-6">

      {/* ── 1. Hero KPIs ── */}
      <RoleHeroBanner
        theme={theme}
        title="Leadership Overview"
        subtitle="Bird's-eye summary — total records, high-potential farmers, pending follow-ups, and rep activity"
        stats={loading ? [
          { label: 'Total Farmers',  value: '…' },
          { label: 'High-Potential', value: '…' },
          { label: 'Pending',        value: '…' },
          { label: 'Inactive Reps',  value: '…' },
        ] : [
          { label: 'Total Farmers',  value: stats.total_farmers      },
          { label: 'High-Potential', value: stats.high_potential     },
          { label: 'Pending',        value: stats.pending_follow_ups },
          { label: 'Inactive Reps',  value: stats.inactive_reps      },
        ]}
      />

      {/* ── Team management quick actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {loading ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <p className="text-xs text-muted-foreground">
            <i className="fas fa-users mr-1.5" />
            <strong>{stats.total_users}</strong> platform users &nbsp;·&nbsp;
            <strong className="text-green-600">{stats.active_users} active</strong>
            &nbsp;·&nbsp;
            <strong className="text-red-500">{stats.total_users - stats.active_users} inactive</strong>
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.abs.permissionMatrix)}>
            <i className="fas fa-shield-halved mr-2 text-purple-600" /> Permission Matrix
          </Button>
          <Button onClick={() => navigate(ROUTES.abs.onboardUser)}>
            <i className="fas fa-user-plus mr-2" /> Add New User
          </Button>
        </div>
      </div>

      {/* ── 2. KPI cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        )) : [
          { icon: 'fas fa-database',          value: stats.total_farmers,      label: 'Total Records',           sub: 'Registered farmers',                          up: true,  color: theme.accent },
          { icon: 'fas fa-fire-flame-curved', value: stats.high_potential,     label: 'High-Potential Farmers',  sub: 'Interest level: High',                        up: true,  color: '#16a34a' },
          { icon: 'fas fa-clock-rotate-left', value: stats.pending_follow_ups, label: 'Pending Follow-ups',      sub: 'Follow-up date passed',                       up: false, color: '#ef4444' },
          { icon: 'fas fa-user-slash',        value: stats.inactive_reps,      label: 'Inactive Reps',           sub: `${stats.active_reps} reps active`,            up: stats.inactive_reps === 0, color: stats.inactive_reps > 0 ? '#dc2626' : '#16a34a' },
        ].map(({ icon, value, label, sub, up, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-start gap-3 hover:shadow-elevated transition-shadow"
            style={{ borderTopWidth: 3, borderTopColor: color }}>
            <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: `${color}15` }}>
              <i className={`${icon} text-base`} style={{ color }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[1.7rem] font-extrabold text-foreground leading-none">{value}</div>
              <div className="text-[0.72rem] font-semibold text-foreground mt-1 leading-tight">{label}</div>
              <div className={`flex items-center gap-1 mt-1.5 text-[0.67rem] font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                <i className={`fas fa-${up ? 'circle-check' : 'circle-exclamation'} text-[0.6rem]`} /> {sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. View As Team Member ── */}
      <Card>
        <Card.Header title="View Team Member's Workspace" icon="fas fa-eye" iconStyle={{ color: theme.accent }}>
          <span className="text-xs text-muted-foreground font-normal">Click any member to enter their screen</span>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {['admin', 'team_lead', 'agronomist', 'data_entry_operator'].map(r => {
                const members = users.filter(u => u.role === r && u.status === 'active');
                if (!members.length) return null;
                const meta = TEAM_ROLE_META[r];
                return (
                  <div key={r}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <i className={`${meta.icon} text-xs shrink-0`} style={{ color: meta.color }} />
                      <span className="text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground">{meta.label}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {members.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleViewAs(u)}
                          className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-card hover:shadow-md transition-all"
                          style={{ borderColor: meta.border }}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                            style={{ background: meta.color }}>
                            {u.initials}
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-foreground leading-tight">{u.name}</div>
                            <div className="text-[0.6rem] text-muted-foreground mt-0.5">{u.territory ?? 'All areas'} · {u.mobile}</div>
                          </div>
                          <div className="ml-2 w-7 h-7 rounded-lg flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                            style={{ background: meta.bg }}>
                            <i className="fas fa-arrow-up-right-from-square text-[0.6rem]" style={{ color: meta.color }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No team members found.</p>
              )}
            </div>
          )}
          <p className="text-[0.65rem] text-muted-foreground mt-4 border-t border-border pt-3">
            <i className="fas fa-shield-halved mr-1 text-blue-400" />
            You are viewing as a read-only observer. Click <strong>Return to Leadership</strong> in the top bar to exit.
          </p>
        </Card.Body>
      </Card>

      {/* ── 4. Conversion Funnel + Weekly Trend ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <Card.Header title="Farmer Conversion Funnel" icon="fas fa-filter" iconStyle={{ color: theme.accent }}>
              {stats && (
                <Badge variant="warning">
                  {stats.conversion_funnel[4]?.pct ?? 0}% converted
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-4">
                  {stats.conversion_funnel.map(({ stage, count, pct, note }, idx) => {
                    const barColor = idx === 4 ? '#16a34a' : idx >= 3 ? '#d97706' : theme.accent;
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[0.6rem] font-bold text-white shrink-0"
                              style={{ background: barColor }}>{idx + 1}</span>
                            <span className="text-xs font-semibold text-foreground">{stage}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: barColor }}>{count} ({pct}%)</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <div className="text-[0.65rem] text-muted-foreground pl-7">{note}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        <div>
          <Card>
            <Card.Header title="Weekly Capture Trend" icon="fas fa-chart-column" iconStyle={{ color: theme.accent }} />
            <Card.Body>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : stats.weekly_capture.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">No registrations in the last 5 weeks.</p>
              ) : (
                <div className="space-y-3">
                  {stats.weekly_capture.map(({ week, captured }) => (
                    <div key={week} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{week}</span>
                        <span className="font-bold" style={{ color: theme.accent }}>{captured}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round((captured / weekMax) * 100)}%`, background: `linear-gradient(90deg, ${theme.bannerFrom}, ${theme.bannerTo})` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* ── 5. Representative Productivity ── */}
      <Card>
        <Card.Header title="Representative Productivity" icon="fas fa-users-gear" iconStyle={{ color: theme.accent }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.REPORTS)}>
            <i className="fas fa-download mr-1" /> Export Report
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : stats.rep_productivity.length === 0 ? (
            <p className="p-5 text-xs text-muted-foreground italic">No field representatives found.</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {stats.rep_productivity.map((rep) => {
                  const total = rep.farmers_captured;
                  const pct   = total > 0 ? Math.min(100, Math.round((total / Math.max(total, 1)) * 100)) : 0;
                  const isLow = rep.pending_visits > 8;
                  return (
                    <div key={rep.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                            {rep.initials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{rep.name}</div>
                            <div className="text-[0.65rem] text-muted-foreground">{rep.territory ?? '—'}</div>
                          </div>
                        </div>
                        <Badge variant={rep.status === 'active' ? 'success' : 'danger'}>{rep.status}</Badge>
                      </div>
                      <div className="flex gap-3 text-[0.65rem]">
                        <span className="text-muted-foreground"><i className="fas fa-users mr-1" />{rep.farmers_captured} farmers</span>
                        <span className={`font-medium ${isLow ? 'text-red-500' : 'text-muted-foreground'}`}>
                          <i className="fas fa-clock mr-1" />{rep.pending_visits} pending
                        </span>
                        <span className="text-muted-foreground"><i className="fas fa-circle-dot mr-1" />{rep.last_active ?? 'No activity'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Representative', 'Territory', 'Farmers Captured', 'Pending Visits', 'Last Active', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.rep_productivity.map((rep) => {
                      const isLow = rep.pending_visits > 8;
                      return (
                        <tr key={rep.id}
                          className={`border-b border-border last:border-0 transition-colors ${rep.status === 'inactive' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-muted/20'}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                style={{ background: rep.status === 'inactive' ? '#9ca3af' : `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                                {rep.initials}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-foreground">{rep.name}</div>
                                <div className="text-[0.62rem] text-muted-foreground">{rep.mobile}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{rep.territory ?? '—'}</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-foreground">{rep.farmers_captured}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`text-xs font-bold ${isLow ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {rep.pending_visits}
                              {isLow && <i className="fas fa-exclamation ml-1 text-[0.6rem]" />}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">{rep.last_active ?? '—'}</td>
                          <td className="px-5 py-3.5">
                            <Badge variant={rep.status === 'active' ? 'success' : 'danger'}>{rep.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-border bg-muted/20 text-[0.68rem] text-muted-foreground">
                <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 align-middle" />Pending visits &gt; 8 — needs attention</span>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* ── 6. Adoption Readiness + Risk Indicators ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <Card.Header title="Adoption Readiness Distribution" icon="fas fa-chart-pie" iconStyle={{ color: theme.accent }}>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.REPORTS)}>Detailed Report</Button>
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="space-y-5">
                {adoptionBands.map(({ label, count, pct, color, note }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: color }} />
                        <div>
                          <div className="text-xs font-semibold text-foreground">{label}</div>
                          <div className="text-[0.62rem] text-muted-foreground">{note}</div>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold shrink-0" style={{ color }}>{count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="text-[0.62rem] text-muted-foreground">{pct}% of scored farmers</div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex justify-between text-xs">
                  <span className="text-muted-foreground">Total farmers scored</span>
                  <span className="font-bold text-foreground">{stats.adoption_high + stats.adoption_medium + stats.adoption_low}</span>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Risk Indicators" icon="fas fa-shield-halved" iconStyle={{ color: '#dc2626' }}>
            {stats && (
              <Badge variant="danger">
                {stats.risks.filter(r => r.level === 'danger').length} critical
              </Badge>
            )}
          </Card.Header>
          <Card.Body>
            {loading ? (
              <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {stats.risks.map(({ id, text, level, action }) => {
                  const s = RISK_STYLE[level];
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: s.bg, borderColor: s.border }}>
                      <i className={`${s.icon} text-sm shrink-0`} style={{ color: s.color }} />
                      <span className="flex-1 text-xs font-medium text-foreground">{text}</span>
                      {action && (
                        <button className="text-[0.65rem] font-semibold shrink-0 underline underline-offset-2"
                          style={{ color: s.color }}>
                          {action}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-[0.65rem] text-muted-foreground">
              <i className="fas fa-sync mr-1" /> Risk indicators reflect live data.
            </p>
          </Card.Body>
        </Card>
      </div>

      {/* ── Quick link to full Leadership Reports ── */}
      <div className="rounded-2xl border-2 border-dashed p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderColor: `${theme.accent}50`, background: `${theme.accentLight}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
            <i className="fas fa-chart-mixed text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">Full Performance Intelligence Report</div>
            <div className="text-xs text-muted-foreground">Rep productivity · Farmer adoption readiness · Role activity log</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/app/leadership/performance')}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow transition-opacity hover:opacity-90 shrink-0"
          style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}
        >
          <i className="fas fa-arrow-right" /> View Full Report
        </button>
      </div>

    </div>
  );
}
