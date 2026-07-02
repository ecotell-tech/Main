import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Badge        from '@common/Badge/Badge';
import ProgressBar  from '@common/ProgressBar/ProgressBar';
import { useAuth }  from '@context/AuthContext';
import { getFarmers }                           from '@services/farmerService';
import { getReportRows, getTopFarmers }         from '@services/reportService';

const SupervisorReportsPage = lazy(() =>
  import('@features/supervisor/SupervisorReportsPage/SupervisorReportsPage')
);

/* ─── Role gate ────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { currentUser } = useAuth();

  if (currentUser?.role === 'team_lead' || currentUser?.role === 'supervisor') {
    return (
      <Suspense fallback={<SpinnerBlock />}>
        <SupervisorReportsPage />
      </Suspense>
    );
  }

  return <RepReport />;
}

/* ─── Shared helpers ─────────────────────────────────────────────────*/
function SpinnerBlock() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-2">
      <i className="fas fa-circle-notch fa-spin" /> Loading…
    </div>
  );
}

function KpiTile({ label, value, icon, color, sub }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${icon} text-xs`} style={{ color }} />
        <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      {sub && <div className="text-[0.62rem] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-foreground font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const BAND = (s) =>
  s >= 70 ? { label: 'High',   color: '#16a34a', bg: '#dcfce7', ring: '#bbf7d0', variant: 'success' }
: s >= 40 ? { label: 'Medium', color: '#d97706', bg: '#fef3c7', ring: '#fde68a', variant: 'warning' }
:           { label: 'Low',    color: '#ef4444', bg: '#fee2e2', ring: '#fecaca', variant: 'danger'  };

const REVIEW_META = {
  approved:       { icon: 'fas fa-check-circle',      color: '#16a34a', label: 'Approved'       },
  rejected:       { icon: 'fas fa-times-circle',       color: '#ef4444', label: 'Rejected'       },
  pending_review: { icon: 'fas fa-clock',              color: '#d97706', label: 'Pending Review' },
};

const PLAN_META = {
  active:    { variant: 'success', label: 'Active'    },
  completed: { variant: 'info',    label: 'Completed' },
  pending:   { variant: 'warning', label: 'Pending'   },
  inactive:  { variant: 'default', label: 'Inactive'  },
};

/* ─── Main rep report ────────────────────────────────────────────────*/
function RepReport() {
  const [farmers,     setFarmers]     = useState([]);
  const [topFarmers,  setTopFarmers]  = useState([]);
  const [planRows,    setPlanRows]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('best');

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getFarmers({ limit: 500 }), getReportRows(), getTopFarmers({ limit: 10 })])
      .then(([farmerRes, reportRes, topRes]) => {
        setFarmers(farmerRes.farmers ?? []);
        setPlanRows(reportRes.rows ?? []);
        setTopFarmers(topRes.farmers ?? []);
      })
      .catch(err => setError(err?.message || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  /* ── Derived stats ─────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total    = farmers.length;
    const high     = farmers.filter(f => f.adoptionScore >= 70).length;
    const medium   = farmers.filter(f => f.adoptionScore >= 40 && f.adoptionScore < 70).length;
    const low      = farmers.filter(f => f.adoptionScore < 40).length;
    const approved = farmers.filter(f => f.reviewStatus === 'approved').length;
    const rejected = farmers.filter(f => f.reviewStatus === 'rejected').length;
    const pending  = farmers.filter(f => f.reviewStatus === 'pending_review').length;
    const completed = farmers.filter(f => f.planStatus === 'completed').length;
    const active    = farmers.filter(f => f.planStatus === 'active').length;
    const avgScore  = total > 0
      ? Math.round(farmers.reduce((s, f) => s + (f.adoptionScore ?? 0), 0) / total)
      : 0;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, high, medium, low, approved, rejected, pending, completed, active, avgScore, approvalRate };
  }, [farmers]);

  const rejectedFarmers = useMemo(() =>
    farmers.filter(f => f.reviewStatus === 'rejected'),
  [farmers]);

  const completedPlans = useMemo(() =>
    planRows.filter(r => r.plan_status === 'completed'),
  [planRows]);

  const activePlans = useMemo(() =>
    planRows.filter(r => r.plan_status === 'active'),
  [planRows]);

  /* ── Loading / error ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <i className="fas fa-circle-exclamation" /> {error}
          <button className="ml-auto underline text-xs" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'best',      label: 'Best Farmers',     icon: 'fas fa-star'           },
    { id: 'rejected',  label: `Rejected (${stats.rejected})`, icon: 'fas fa-times-circle' },
    { id: 'plans',     label: 'Plans',             icon: 'fas fa-file-lines'     },
  ];

  return (
    <div id="page-reports" className="space-y-5 max-w-4xl mx-auto">
      <Header farmers={farmers} stats={stats} />

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiTile
          label="Total Registered"  value={stats.total}
          icon="fas fa-users"       color="#2563eb"
          sub={`avg score ${stats.avgScore}`}
        />
        <KpiTile
          label="High Readiness"    value={stats.high}
          icon="fas fa-star"        color="#16a34a"
          sub={`${stats.total > 0 ? Math.round((stats.high / stats.total) * 100) : 0}% of total`}
        />
        <KpiTile
          label="Approved"          value={stats.approved}
          icon="fas fa-check-circle" color="#16a34a"
          sub={`${stats.approvalRate}% approval rate`}
        />
        <KpiTile
          label="Rejected"          value={stats.rejected}
          icon="fas fa-times-circle" color="#ef4444"
          sub="need re-editing"
        />
        <KpiTile
          label="Plans Completed"   value={stats.completed}
          icon="fas fa-flag-checkered" color="#7c3aed"
          sub={`${stats.active} active`}
        />
      </div>

      {/* ── Data quality bar ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <i className="fas fa-shield-check text-sm text-blue-600" />
          <span className="text-sm font-bold text-foreground">Data Quality</span>
          <span className="ml-auto text-xs text-muted-foreground">{stats.total} farmers</span>
        </div>
        <div className="space-y-3">
          <BarRow label="Approved"       value={stats.approved} max={stats.total} color="#16a34a" />
          <BarRow label="Pending Review" value={stats.pending}  max={stats.total} color="#d97706" />
          <BarRow label="Rejected"       value={stats.rejected} max={stats.total} color="#ef4444" />
        </div>
        {/* Readiness distribution */}
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Readiness Distribution</div>
          <div className="space-y-3">
            <BarRow label="High (≥70)"    value={stats.high}   max={stats.total} color="#16a34a" />
            <BarRow label="Medium (40–69)" value={stats.medium} max={stats.total} color="#d97706" />
            <BarRow label="Low (<40)"     value={stats.low}    max={stats.total} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Best Farmers tab ─────────────────────────────────────── */}
      {activeTab === 'best' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <i className="fas fa-trophy text-amber-500 text-sm" />
            <span className="text-sm font-bold text-foreground">Top Performing Farmers</span>
            <span className="ml-auto text-xs text-muted-foreground">Score = readiness + plan progress · approved only</span>
          </div>

          {topFarmers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
              <i className="fas fa-star text-3xl text-amber-300 opacity-50" />
              <div className="text-sm font-semibold text-foreground">No top performers yet</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Farmers appear here once they are <span className="font-semibold">approved</span> by your team lead. Keep registering and submitting for review.
              </p>
            </div>
          ) : (
            topFarmers.map((f, idx) => {
              const score = f.adoption_score ?? 0;
              const b     = BAND(score);
              const pm    = PLAN_META[f.plan_status] ?? PLAN_META.pending;
              const rank  = idx + 1;
              const rankColor = rank === 1 ? '#f59e0b' : rank === 2 ? '#9ca3af' : rank === 3 ? '#b45309' : '#6b7280';
              const pct   = f.plan_completion_pct != null ? Math.round(f.plan_completion_pct) : null;
              const maxComposite = 130; // adoption(100) + plan bonus(30)
              const compositePct = Math.round((f.composite_score / maxComposite) * 100);

              return (
                <div key={f.farmer_id}
                  className="rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Rank */}
                    <div className="w-6 text-center shrink-0">
                      {rank <= 3
                        ? <i className="fas fa-trophy text-sm" style={{ color: rankColor }} />
                        : <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
                      }
                    </div>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                      style={{ background: f.avatar_gradient ?? 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                      {f.initials ?? f.farmer_name?.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{f.farmer_name}</div>
                      <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                        {f.village_name ?? '—'} · {f.primary_crop ?? '—'} · {f.district_name ?? '—'}
                      </div>
                    </div>
                    {/* Right: score + plan */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <div className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                        style={{ background: b.bg, color: b.color, borderColor: b.ring }}>
                        {score} · {b.label}
                      </div>
                      <Badge variant={pm.variant}>{pm.label}</Badge>
                    </div>
                  </div>
                  {/* Composite score bar */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between text-[0.6rem] text-muted-foreground mb-1">
                      <span>Performance score</span>
                      <span className="font-bold text-foreground">
                        {f.composite_score}
                        {pct != null && <span className="text-muted-foreground font-normal"> · plan {pct}%</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${compositePct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Rejected tab ─────────────────────────────────────────── */}
      {activeTab === 'rejected' && (
        <div className="space-y-3">
          {rejectedFarmers.length === 0 ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <i className="fas fa-circle-check text-3xl text-green-500 mb-3" />
              <div className="text-sm font-semibold text-green-700">No rejected records</div>
              <p className="text-xs text-green-600 mt-1">All your submissions are clean.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                <i className="fas fa-circle-exclamation text-red-500 mt-0.5" />
                <div className="text-xs text-red-700">
                  <span className="font-bold">{rejectedFarmers.length} record{rejectedFarmers.length !== 1 ? 's' : ''}</span> rejected by team lead — open each farmer and edit the highlighted fields, then resubmit.
                </div>
              </div>
              {rejectedFarmers.map(f => (
                <div key={f.id} className="rounded-xl border border-red-200 bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                      style={{ background: f.avatarGradient }}>
                      {f.initials ?? f.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{f.name}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{f.village} · {f.crop} · {f.district}</div>
                      {f.rejectionReason && (
                        <div className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                          <i className="fas fa-comment-dots mr-1.5" />
                          {f.rejectionReason}
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-600 shrink-0">
                      Score {f.adoptionScore}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[0.65rem] text-muted-foreground border-t border-border pt-2.5">
                    <span>Registered {f.registrationDate}</span>
                    <a href={`/app/farmers/${f.id}`}
                      className="text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                      Edit &amp; Resubmit <i className="fas fa-arrow-right text-[0.6rem]" />
                    </a>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Plans tab ────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {/* Active Plans */}
          <Section
            title="Active Plans"
            icon="fas fa-play-circle"
            iconColor="#16a34a"
            badge={<Badge variant="success">{activePlans.length}</Badge>}
          >
            {activePlans.length === 0
              ? <EmptyState icon="fas fa-file-lines" message="No active plans" />
              : <PlanList rows={activePlans} />
            }
          </Section>

          {/* Completed Plans */}
          <Section
            title="Completed Plans"
            icon="fas fa-flag-checkered"
            iconColor="#7c3aed"
            badge={<Badge variant="info">{completedPlans.length}</Badge>}
          >
            {completedPlans.length === 0
              ? <EmptyState icon="fas fa-check-double" message="No completed plans yet" />
              : <PlanList rows={completedPlans} />
            }
          </Section>

          {/* All plans with progress */}
          {planRows.length > 0 && activePlans.length === 0 && completedPlans.length === 0 && (
            <Section title="All Plans" icon="fas fa-file-lines" iconColor="#6b7280">
              <PlanList rows={planRows} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────*/
function Header({ stats }) {
  const approvalRate = stats?.approvalRate ?? 0;
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-xl font-extrabold text-foreground font-heading">My Performance Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {stats
            ? `${stats.total} farmers registered · ${approvalRate}% approval rate`
            : 'Your data at a glance'
          }
        </p>
      </div>
      {stats?.approvalRate >= 80 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
          <i className="fas fa-trophy text-amber-500 text-sm" />
          <span className="text-xs font-semibold text-green-700">Great quality — {approvalRate}% approved</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, iconColor, badge, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <i className={`${icon} text-sm`} style={{ color: iconColor ?? '#6b7280' }} />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
      <i className={`${icon} text-2xl opacity-25`} />
      <span className="text-sm">{message}</span>
    </div>
  );
}

function PlanList({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map(row => {
        const pct = Math.round(row.completion_pct ?? 0);
        const sm  = PLAN_META[row.plan_status] ?? PLAN_META.pending;
        return (
          <div key={row.plan_id ?? row.farmer_id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-xs font-semibold text-foreground truncate">{row.farmer_name}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[0.62rem] text-muted-foreground font-mono">{row.plan_code ?? '—'}</span>
                  <Badge variant={sm.variant}>{sm.label}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1"><ProgressBar value={pct} /></div>
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap w-24 text-right">
                  {row.done_components}/{row.total_components} ({pct}%)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
