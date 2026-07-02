import { useNavigate }    from 'react-router-dom';
import { getTheme }       from '@constants/roleTheme';
import RoleHeroBanner     from '@common/RoleHeroBanner/RoleHeroBanner';
import Card               from '@common/Card/Card';
import Badge              from '@common/Badge/Badge';
import Button             from '@common/Button/Button';
import MOCK_REPS          from '@data/mock/representatives.json';
import { ROUTES }         from '@constants/routes';

const theme = getTheme('admin');

const DISTRICT_COVERAGE = [
  { district: 'Nashik',    covered: 7, total: 10 },
  { district: 'Yeola',     covered: 5, total: 6  },
  { district: 'Sinnar',    covered: 4, total: 7  },
  { district: 'Niphad',    covered: 3, total: 5  },
  { district: 'Dindori',   covered: 5, total: 8  },
  { district: 'Igatpuri',  covered: 2, total: 6  },
  { district: 'Trimbak',   covered: 4, total: 5  },
  { district: 'Baglan',    covered: 3, total: 4  },
];

const DATA_QUALITY = [
  { label: 'Missing mobile numbers',   count: 3,  severity: 'warning' },
  { label: 'Duplicate farmer entries', count: 1,  severity: 'danger'  },
  { label: 'Plans without visit logs', count: 12, severity: 'warning' },
  { label: 'Unassigned farmers',       count: 0,  severity: 'success' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* Hero */}
      <RoleHeroBanner
        theme={theme}
        title="Platform Overview"
        subtitle="Representatives, territories, data quality, and district coverage at a glance"
        stats={[
          { label: 'Representatives', value: 5  },
          { label: 'Farmers in DB',   value: 94 },
          { label: 'Districts',        value: 8  },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-user-tie',      value: 5,    label: 'Representatives',     change: '1 this month',  up: true,  color: theme.accent },
          { icon: 'fas fa-seedling',       value: 94,   label: 'Farmers in Database', change: '14 this week',  up: true,  color: '#16a34a' },
          { icon: 'fas fa-map-marker-alt', value: 8,    label: 'Districts Covered',   change: 'Nashik region', up: true,  color: '#0d9488' },
          { icon: 'fas fa-check-double',   value: 31,   label: 'High-Potential',      change: 'Ready to convert', up: true, color: '#2563eb' },
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

      {/* Representatives overview + Data Quality */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Reps */}
        <Card>
          <Card.Header title="Representatives" icon="fas fa-users" iconStyle={{ color: theme.accent }}>
            <Button variant="primary" size="sm" onClick={() => navigate('/app/admin/users')}>
              <i className="fas fa-user-plus mr-1" /> Add Rep
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-border">
              {MOCK_REPS.map((rep) => (
                <div key={rep.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}
                  >
                    {rep.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{rep.name}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{rep.territory} · {rep.mobile}</div>
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
          </Card.Body>
        </Card>

        {/* Data Quality */}
        <Card>
          <Card.Header title="Data Quality Checks" icon="fas fa-shield-alt" iconStyle={{ color: theme.accent }}>
            <Badge variant="warning">4 items</Badge>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {DATA_QUALITY.map(({ label, count, severity }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{
                    borderColor:
                      severity === 'danger'  ? '#fca5a5' :
                      severity === 'warning' ? '#fcd34d' : '#86efac',
                    background:
                      severity === 'danger'  ? '#fef2f2' :
                      severity === 'warning' ? '#fffbeb' : '#f0fdf4',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <i
                      className={`fas fa-${severity === 'success' ? 'check-circle' : severity === 'danger' ? 'times-circle' : 'exclamation-triangle'} text-sm`}
                      style={{
                        color: severity === 'danger' ? '#ef4444' : severity === 'warning' ? '#d97706' : '#16a34a',
                      }}
                    />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </div>
                  <span
                    className="text-sm font-extrabold"
                    style={{
                      color: severity === 'danger' ? '#ef4444' : severity === 'warning' ? '#d97706' : '#16a34a',
                    }}
                  >
                    {count}
                  </span>
                </div>
              ))}
              <p className="text-[0.68rem] text-muted-foreground pt-1">
                <i className="fas fa-info-circle mr-1" />
                Quality checks run daily at midnight. Last run: Today 00:00
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* District Coverage */}
      <Card>
        <Card.Header title="District Coverage" icon="fas fa-map" iconStyle={{ color: theme.accent }}>
          <Badge variant="info">8 districts</Badge>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-4">
            {DISTRICT_COVERAGE.map(({ district, covered, total }) => {
              const pct = Math.round((covered / total) * 100);
              return (
                <div key={district} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{district}</span>
                    <span className="text-muted-foreground">{covered}/{total} talukas</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: theme.accent }} />
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground">{pct}% covered</div>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

