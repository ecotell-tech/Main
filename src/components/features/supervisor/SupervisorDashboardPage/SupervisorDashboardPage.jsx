import { useState, useEffect, useMemo } from 'react';
import { useNavigate }    from 'react-router-dom';
import { getTheme }       from '@constants/roleTheme';
import RoleHeroBanner     from '@common/RoleHeroBanner/RoleHeroBanner';
import Card               from '@common/Card/Card';
import Badge               from '@common/Badge/Badge';
import Button              from '@common/Button/Button';
import { useToast }        from '@hooks/useToast';
import { getFarmers }      from '@services/farmerService';
import { getUsers }        from '@services/userService';
import { getVisits }       from '@services/visitService';
import { ROUTES }          from '@constants/routes';

const theme = getTheme('team_lead');

function band(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

const BAND_META = {
  high:   { label: 'High (70–100)',  color: '#16a34a', bg: '#dcfce7' },
  medium: { label: 'Medium (40–69)', color: '#d97706', bg: '#fef3c7' },
  low:    { label: 'Low (0–39)',     color: '#ef4444', bg: '#fee2e2' },
};

function relativeDate(iso) {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SupervisorDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [reps,    setReps]    = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, farmersRes, visitsRes] = await Promise.all([
          getUsers(),
          getFarmers({ limit: 500 }),
          getVisits({ limit: 500 }),
        ]);
        if (cancelled) return;
        setReps(users.filter(u => u.role === 'agronomist'));
        setFarmers(farmersRes.farmers);
        setVisits(visitsRes);
      } catch {
        if (!cancelled) showToast('Failed to load dashboard data.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Per-rep rollups (farmers captured, pending visits, last activity) ──
  const repRows = useMemo(() => {
    return reps.map(rep => {
      const repFarmers = farmers.filter(f => f.repId === rep.id);
      const repVisits  = visits.filter(v => v.repId === rep.id);
      const pendingVisits = repVisits.filter(v => v.status === 'pending' || v.status === 'overdue').length;
      const lastDates = [
        ...repFarmers.map(f => f.created_at),
        ...repVisits.map(v => v.createdAt),
      ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
      return {
        ...rep,
        farmersCaptured: repFarmers.length,
        pendingVisits,
        lastActive: relativeDate(lastDates[0]),
      };
    });
  }, [reps, farmers, visits]);

  const maxCaptured = Math.max(...repRows.map(r => r.farmersCaptured), 1);

  // ── Adoption readiness distribution (real farmer scores) ──
  const adoptionBands = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    farmers.forEach(f => { counts[band(f.adoptionScore ?? 0)] += 1; });
    const total = farmers.length || 1;
    return Object.entries(counts).map(([key, count]) => ({
      key, count, pct: Math.round((count / total) * 100), ...BAND_META[key],
    }));
  }, [farmers]);

  const overdueFollowUps = useMemo(
    () => farmers.filter(f => f.planStatus === 'pending').slice(0, 5),
    [farmers],
  );

  // ── KPI roll-ups ──
  const activeReps    = reps.filter(r => r.status === 'active').length;
  const inactiveReps  = reps.length - activeReps;
  const sevenDaysAgo  = Date.now() - 7 * 86400000;
  const capturedThisWeek = farmers.filter(f => f.created_at && new Date(f.created_at).getTime() >= sevenDaysAgo).length;
  const overdueVisits = visits.filter(v => v.status === 'overdue').length;
  const pendingFollowUps = visits.filter(v => v.status === 'pending' || v.status === 'overdue').length;
  const highAdoptionPct = farmers.length
    ? Math.round((farmers.filter(f => (f.adoptionScore ?? 0) >= 70).length / farmers.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <i className="fas fa-spinner fa-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="Monitoring Dashboard"
        subtitle="Track representative-wise data capture, adoption readiness, and pending follow-ups"
        stats={[
          { label: 'Representatives', value: reps.length },
          { label: 'Farmers Captured', value: farmers.length },
          { label: 'Pending Actions', value: pendingFollowUps },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-user-tie',          value: activeReps,             label: 'Active Reps',        change: `${inactiveReps} inactive`,       up: true,  color: theme.accent },
          { icon: 'fas fa-seedling',           value: farmers.length,         label: 'Farmers Captured',   change: `${capturedThisWeek} this week`,  up: true,  color: '#16a34a' },
          { icon: 'fas fa-exclamation-circle', value: pendingFollowUps,       label: 'Pending Follow-ups', change: `${overdueVisits} overdue`,       up: false, color: '#ef4444' },
          { icon: 'fas fa-fire',               value: `${highAdoptionPct}%`,  label: 'High Adoption',      change: 'Score ≥ 70',                     up: true,  color: '#7c3aed' },
        ].map(({ icon, value, label, change, up, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-start gap-3 hover:shadow-elevated transition-shadow"
            style={{ borderTopWidth: 2, borderTopColor: color }}
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: `${color}18` }}>
              <i className={`${icon} text-base`} style={{ color }} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[1.55rem] font-extrabold text-foreground leading-none">{value}</div>
              <div className="text-[0.72rem] font-medium text-muted-foreground mt-1">{label}</div>
              <div className={`flex items-center gap-1 mt-1.5 text-[0.68rem] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                <i className={`fas fa-${up ? 'arrow-up' : 'arrow-down'} text-[0.6rem]`} /> {change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rep Performance Table */}
      <Card>
        <Card.Header title="Representative Performance" icon="fas fa-user-tie" iconStyle={{ color: theme.accent }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.REPORTS)}>
            <i className="fas fa-download mr-1" /> Export
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {repRows.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
              <i className="fas fa-user-tie text-3xl opacity-25" />
              <span className="text-sm">No representatives assigned to your team yet</span>
            </div>
          )}
          {/* Mobile */}
          <div className="md:hidden divide-y divide-border">
            {repRows.map((rep) => {
              const pct = Math.round((rep.farmersCaptured / maxCaptured) * 100);
              return (
                <div key={rep.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                        {rep.initials ?? rep.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{rep.name}</div>
                        <div className="text-[0.65rem] text-muted-foreground">{rep.territory ?? '—'}</div>
                      </div>
                    </div>
                    <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Farmers Captured</span>
                      <span className="font-semibold">{rep.farmersCaptured}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} />
                    </div>
                  </div>
                  <div className="flex gap-4 text-[0.68rem] text-muted-foreground">
                    <span><i className="fas fa-clock mr-1 opacity-60" />Pending: {rep.pendingVisits}</span>
                    <span><i className="fas fa-circle-dot mr-1 opacity-60" />{rep.lastActive}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop */}
          {repRows.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Representative', 'Territory', 'Farmers Captured', 'Pending', 'Last Active', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repRows.map((rep) => {
                    const pct = Math.round((rep.farmersCaptured / maxCaptured) * 100);
                    return (
                      <tr key={rep.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                              {rep.initials ?? rep.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">{rep.name}</div>
                              <div className="text-[0.65rem] text-muted-foreground">{rep.mobile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{rep.territory ?? '—'}</td>
                        <td className="px-5 py-3.5 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} />
                            </div>
                            <span className="text-[0.7rem] font-semibold text-foreground w-10 text-right">
                              {rep.farmersCaptured}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center text-xs font-semibold"
                          style={{ color: rep.pendingVisits > 5 ? '#ef4444' : '#6b7280' }}>
                          {rep.pendingVisits}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{rep.lastActive}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Adoption Bands + Overdue Farmers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <Card.Header title="Adoption Readiness Distribution" icon="fas fa-chart-pie" iconStyle={{ color: theme.accent }} />
          <Card.Body>
            <div className="space-y-4">
              {adoptionBands.map(({ key, label, count, pct, color }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-medium text-foreground">{label}</span>
                    </span>
                    <span className="font-bold" style={{ color }}>{count} farmers ({pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 flex justify-between text-xs text-muted-foreground border-t border-border">
                <span>Total farmers in database</span>
                <span className="font-bold text-foreground">{farmers.length}</span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Overdue Follow-ups" icon="fas fa-clock" iconStyle={{ color: '#ef4444' }}>
            <Badge variant="danger">{overdueVisits} overdue</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-border">
              {overdueFollowUps.length === 0 && (
                <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
                  <i className="fas fa-circle-check text-2xl opacity-25" />
                  <span className="text-sm">No pending follow-ups</span>
                </div>
              )}
              {overdueFollowUps.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: f.avatarGradient || `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                    {f.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{f.name}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{f.crop} · {f.village}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[0.65rem] text-red-500 font-semibold">Last: {f.lastVisit}</div>
                    <Badge variant="warning">pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
