import { useNavigate }  from 'react-router-dom';
import { getTheme }     from '@constants/roleTheme';
import RoleHeroBanner   from '@common/RoleHeroBanner/RoleHeroBanner';
import Card             from '@common/Card/Card';
import Badge            from '@common/Badge/Badge';
import Button           from '@common/Button/Button';
import MOCK_FARMERS     from '@data/mock/farmers.json';
import { ROUTES }       from '@constants/routes';

const theme = getTheme('data_entry_operator');

const QUOTA = { captured: 4, target: 8 };

const DRAFTS = [
  { id: 'd1', name: 'Bharat Lokhande',  crop: 'Onion',  village: 'Chandwad',  savedAt: '09:45 AM' },
  { id: 'd2', name: 'Rekha Shinde',     crop: 'Tomato', village: 'Pimpalgaon', savedAt: '10:12 AM' },
  { id: 'd3', name: 'Manoj Kale',       crop: 'Grapes', village: 'Niphad',     savedAt: '11:30 AM' },
];

export default function DEODashboardPage() {
  const navigate = useNavigate();
  const quotaPct = Math.round((QUOTA.captured / QUOTA.target) * 100);
  const recent   = MOCK_FARMERS.slice(0, 5);

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="Data Capture Dashboard"
        subtitle="Register new farmers, log field visits, and track your daily data entry quota"
        stats={[
          { label: 'Captured Today', value: QUOTA.captured },
          { label: 'Drafts Saved',   value: DRAFTS.length  },
          { label: 'Visits Logged',  value: 3              },
        ]}
      />

      {/* Quick-action strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Register Farmer', icon: 'fas fa-user-plus',      bg: 'bg-teal-50 border-teal-200 text-teal-700',    action: () => navigate(ROUTES.REGISTER) },
          { label: 'Log a Visit',     icon: 'fas fa-calendar-check',  bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',   action: () => navigate(ROUTES.VISITS)   },
          { label: 'View Farmers',    icon: 'fas fa-users',            bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', action: () => navigate(ROUTES.FARMERS)  },
          { label: 'My Reports',      icon: 'fas fa-file-alt',         bg: 'bg-sky-50 border-sky-200 text-sky-700',      action: () => navigate(ROUTES.REPORTS)  },
        ].map(({ label, icon, bg, action }) => (
          <button
            key={label}
            onClick={action}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-semibold transition-all hover:shadow-md active:scale-95 ${bg}`}
          >
            <i className={`${icon} text-xl`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-keyboard',         value: QUOTA.captured, label: 'Captured Today',  change: `${QUOTA.target - QUOTA.captured} remaining`,  up: true,  color: theme.accent },
          { icon: 'fas fa-file-pen',          value: DRAFTS.length,  label: 'Drafts Pending',  change: 'Complete before EOD',                          up: false, color: '#d97706' },
          { icon: 'fas fa-calendar-check',    value: 3,              label: 'Visits Logged',    change: 'Today',                                        up: true,  color: '#2563eb' },
          { icon: 'fas fa-check-double',      value: 47,             label: 'Total This Week',  change: 'On target',                                    up: true,  color: '#16a34a' },
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
              <div className={`flex items-center gap-1 mt-1.5 text-[0.68rem] font-semibold ${up ? 'text-green-600' : 'text-amber-600'}`}>
                <i className={`fas fa-${up ? 'arrow-up' : 'exclamation'} text-[0.6rem]`} /> {change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Quota + Drafts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Quota progress */}
        <Card>
          <Card.Header title="Daily Capture Quota" icon="fas fa-bullseye" iconStyle={{ color: theme.accent }}>
            <Badge variant={quotaPct >= 100 ? 'success' : 'warning'}>{quotaPct}% complete</Badge>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-extrabold text-foreground" style={{ color: theme.accent }}>
                    {QUOTA.captured}
                    <span className="text-xl text-muted-foreground font-medium ml-1">/ {QUOTA.target}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">farmers captured today</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="text-2xl font-extrabold text-amber-600">{QUOTA.target - QUOTA.captured}</div>
                </div>
              </div>
              <div className="h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${quotaPct}%`, background: `linear-gradient(90deg, ${theme.bannerFrom}, ${theme.accent})` }}
                />
              </div>
              <p className="text-[0.68rem] text-muted-foreground">
                <i className="fas fa-info-circle mr-1" />
                Quota resets daily at midnight. Keep going — you're at {quotaPct}%!
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate(ROUTES.REGISTER)}>
                <i className="fas fa-user-plus mr-2" /> Register New Farmer
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Drafts */}
        <Card>
          <Card.Header title="Saved Drafts" icon="fas fa-file-pen" iconStyle={{ color: '#d97706' }}>
            <Badge variant="warning">{DRAFTS.length} pending</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-border">
              {DRAFTS.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${theme.accent}18` }}>
                    <i className="fas fa-file-alt text-sm" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{d.name}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{d.crop} · {d.village}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[0.65rem] text-muted-foreground">{d.savedAt}</div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.REGISTER)}>
                      Continue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <Card.Header title="Recently Entered Farmers" icon="fas fa-history" iconStyle={{ color: theme.accent }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.FARMERS)}>View All</Button>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Farmer', 'Crop', 'Location', 'Status', 'Last Visit'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0"
                          style={{ background: f.avatarGradient || `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                          {f.initials}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{f.name}</div>
                          <div className="text-[0.62rem] text-muted-foreground">{f.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">{f.crop}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{f.village}</td>
                    <td className="px-5 py-3">
                      <Badge variant={f.planStatus === 'active' ? 'success' : f.planStatus === 'pending' ? 'warning' : 'info'}>
                        {f.planStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{f.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
