import { useNavigate }    from 'react-router-dom';
import { getTheme }       from '@constants/roleTheme';
import RoleHeroBanner     from '@common/RoleHeroBanner/RoleHeroBanner';
import Card               from '@common/Card/Card';
import Badge              from '@common/Badge/Badge';
import Button             from '@common/Button/Button';
import MOCK_REPS          from '@data/mock/representatives.json';
import MOCK_FARMERS       from '@data/mock/farmers.json';
import { ROUTES }         from '@constants/routes';

const theme = getTheme('team_lead');

const ADOPTION_BANDS = [
  { label: 'High (70–100)',   count: 31, pct: 33, color: '#16a34a', bg: '#dcfce7' },
  { label: 'Medium (40–69)', count: 42, pct: 45, color: '#d97706', bg: '#fef3c7' },
  { label: 'Low (0–39)',     count: 21, pct: 22, color: '#ef4444', bg: '#fee2e2' },
];

export default function SupervisorDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="Monitoring Dashboard"
        subtitle="Track representative-wise data capture, adoption readiness, and pending follow-ups"
        stats={[
          { label: 'Representatives', value: 5  },
          { label: 'Farmers Captured', value: 94 },
          { label: 'Pending Actions', value: 30 },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-user-tie',          value: 5,    label: 'Active Reps',       change: '1 inactive',    up: true,  color: theme.accent },
          { icon: 'fas fa-seedling',           value: 94,   label: 'Farmers Captured',  change: '14 this week',  up: true,  color: '#16a34a' },
          { icon: 'fas fa-exclamation-circle', value: 30,   label: 'Pending Follow-ups',change: '8 overdue',     up: false, color: '#ef4444' },
          { icon: 'fas fa-fire',               value: '33%',label: 'High Adoption',     change: 'Score ≥ 70',    up: true,  color: '#7c3aed' },
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
          {/* Mobile */}
          <div className="md:hidden divide-y divide-border">
            {MOCK_REPS.map((rep) => {
              const pct = Math.round((rep.farmersCaptured / rep.farmersAssigned) * 100);
              return (
                <div key={rep.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                        {rep.initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{rep.name}</div>
                        <div className="text-[0.65rem] text-muted-foreground">{rep.territory}</div>
                      </div>
                    </div>
                    <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Capture Progress</span>
                      <span className="font-semibold">{rep.farmersCaptured}/{rep.farmersAssigned} ({pct}%)</span>
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Representative', 'Territory', 'Capture Progress', 'Pending', 'Last Active', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_REPS.map((rep) => {
                  const pct = Math.round((rep.farmersCaptured / rep.farmersAssigned) * 100);
                  return (
                    <tr key={rep.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                            {rep.initials}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{rep.name}</div>
                            <div className="text-[0.65rem] text-muted-foreground">{rep.mobile}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{rep.territory}</td>
                      <td className="px-5 py-3.5 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} />
                          </div>
                          <span className="text-[0.7rem] font-semibold text-foreground w-20 text-right">
                            {rep.farmersCaptured}/{rep.farmersAssigned} ({pct}%)
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
        </Card.Body>
      </Card>

      {/* Adoption Bands + Overdue Farmers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <Card.Header title="Adoption Readiness Distribution" icon="fas fa-chart-pie" iconStyle={{ color: theme.accent }} />
          <Card.Body>
            <div className="space-y-4">
              {ADOPTION_BANDS.map(({ label, count, pct, color }) => (
                <div key={label} className="space-y-1.5">
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
                <span className="font-bold text-foreground">94</span>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Overdue Follow-ups" icon="fas fa-clock" iconStyle={{ color: '#ef4444' }}>
            <Badge variant="danger">8 overdue</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-border">
              {MOCK_FARMERS.filter((f) => f.planStatus === 'pending').slice(0, 5).map((f) => (
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
