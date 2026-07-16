import { useEffect, useMemo, useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import { getTheme }       from '@constants/roleTheme';
import RoleHeroBanner     from '@common/RoleHeroBanner/RoleHeroBanner';
import Card               from '@common/Card/Card';
import Badge              from '@common/Badge/Badge';
import Button             from '@common/Button/Button';
import { getUsers }              from '@services/userService';
import { getFarmers }            from '@services/farmerService';
import { getLeadershipStats }    from '@services/dashboardService';
import { useToast }       from '@hooks/useToast';

const theme = getTheme('admin');

const RISK_META = {
  danger:  { severity: 'danger',  icon: 'times-circle',       color: '#ef4444', border: '#fca5a5', bg: '#fef2f2' },
  warning: { severity: 'warning', icon: 'exclamation-triangle', color: '#d97706', border: '#fcd34d', bg: '#fffbeb' },
  ok:      { severity: 'success', icon: 'check-circle',       color: '#16a34a', border: '#86efac', bg: '#f0fdf4' },
};

function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return (Date.now() - d) / 86_400_000;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reps, setReps]       = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [stats, setStats]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [repsData, farmersData, statsData] = await Promise.all([
          getUsers({ role: 'agronomist' }),
          getFarmers({ limit: 500 }),
          getLeadershipStats(),
        ]);
        if (cancelled) return;
        setReps(repsData);
        setFarmers(farmersData.farmers);
        setStats(statsData);
      } catch (err) {
        if (!cancelled) showToast(err.message || 'Failed to load dashboard data.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const districtCounts = useMemo(() => {
    const map = new Map();
    for (const f of farmers) {
      const d = f.district && f.district !== '—' ? f.district : null;
      if (!d) continue;
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);
  }, [farmers]);

  const capturedThisWeek = useMemo(
    () => farmers.filter(f => { const d = daysSince(f.createdAt ?? f.created_at); return d != null && d <= 7; }).length,
    [farmers]
  );

  const totalReps      = reps.length;
  const totalFarmers   = stats?.total_farmers ?? farmers.length;
  const districtsCount = districtCounts.length;
  const highPotential  = stats?.high_potential ?? 0;
  const risks          = stats?.risks ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <i className="fas fa-spinner fa-spin mr-2" />Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="Platform Overview"
        subtitle="Representatives, territories, risk indicators, and district coverage at a glance"
        stats={[
          { label: 'Representatives', value: totalReps      },
          { label: 'Farmers in DB',   value: totalFarmers   },
          { label: 'Districts',       value: districtsCount },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-user-tie',      value: totalReps,      label: 'Representatives',     change: null, color: theme.accent },
          { icon: 'fas fa-seedling',      value: totalFarmers,   label: 'Farmers in Database', change: capturedThisWeek > 0 ? `${capturedThisWeek} this week` : null, up: true, color: '#16a34a' },
          { icon: 'fas fa-map-marker-alt', value: districtsCount, label: 'Districts Covered',   change: null, color: '#0d9488' },
          { icon: 'fas fa-check-double',  value: highPotential,  label: 'High-Potential',      change: 'Interest level: High', up: true, color: '#2563eb' },
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
              {change && (
                <div className={`flex items-center gap-1 mt-1.5 text-[0.68rem] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                  <i className={`fas fa-${up ? 'arrow-up' : 'arrow-down'} text-[0.6rem]`} /> {change}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Representatives overview + Risk Indicators */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Reps */}
        <Card>
          <Card.Header title="Representatives" icon="fas fa-users" iconStyle={{ color: theme.accent }}>
            <Button variant="primary" size="sm" onClick={() => navigate('/app/admin/users')}>
              <i className="fas fa-user-plus mr-1" /> Add Rep
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {reps.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">
                <i className="fas fa-user-slash mr-1.5" />No representatives registered yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {reps.map((rep) => (
                  <div key={rep.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}
                    >
                      {rep.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">{rep.name}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{rep.territory || rep.district || 'No territory set'} · {rep.mobile}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/app/admin/users')}>
                        <i className="fas fa-pen text-[0.6rem]" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Risk Indicators */}
        <Card>
          <Card.Header title="Risk Indicators" icon="fas fa-shield-alt" iconStyle={{ color: theme.accent }}>
            <Badge variant="warning">{risks.filter(r => r.level !== 'ok').length} items</Badge>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {risks.map((risk) => {
                const meta = RISK_META[risk.level] ?? RISK_META.ok;
                return (
                  <div
                    key={risk.id}
                    className="flex items-center justify-between rounded-xl border px-4 py-3"
                    style={{ borderColor: meta.border, background: meta.bg }}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className={`fas fa-${meta.icon} text-sm`} style={{ color: meta.color }} />
                      <span className="text-xs font-medium text-foreground">{risk.text}</span>
                    </div>
                    {risk.action && (
                      <span className="text-[0.65rem] font-semibold" style={{ color: meta.color }}>
                        {risk.action}
                      </span>
                    )}
                  </div>
                );
              })}
              <p className="text-[0.68rem] text-muted-foreground pt-1">
                <i className="fas fa-info-circle mr-1" />
                Computed live from representative activity and follow-up status.
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* District Coverage */}
      <Card>
        <Card.Header title="District Coverage" icon="fas fa-map" iconStyle={{ color: theme.accent }}>
          <Badge variant="info">{districtsCount} district{districtsCount === 1 ? '' : 's'}</Badge>
        </Card.Header>
        <Card.Body>
          {districtCounts.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs">
              <i className="fas fa-map-marker-alt mr-1.5" />No farmers with a recorded district yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-4">
              {districtCounts.map(({ district, count }) => {
                const max = districtCounts[0].count || 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={district} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{district}</span>
                      <span className="text-muted-foreground">{count} farmer{count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} />
                    </div>
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
