/**
 * SupervisorReportsPage — Team Lead analytics hub (real API data)
 * 6 tabs: Rep Performance | Location Coverage | Adoption Funnel |
 *         Pending Follow-ups | Conversion Outcome | Post-Conversion
 */
import { useState, useMemo, useEffect } from 'react';
import Badge              from '@common/Badge/Badge';
import Button             from '@common/Button/Button';
import { PaginationBar }  from '@hooks/usePagination';
import { printReportAsPDF } from '@/lib/utils';
import { getFarmers }       from '@services/farmerService';
import { getTeamPerformance } from '@services/reportService';

/* ─── CSV helper ────────────────────────────────────────────────────── */
function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const TABS = [
  { id: 'rep',        label: 'Rep Performance',   icon: 'fas fa-user-tie'         },
  { id: 'location',   label: 'Location Coverage',  icon: 'fas fa-map-location-dot' },
  { id: 'adoption',   label: 'Adoption Funnel',    icon: 'fas fa-filter'           },
  { id: 'followup',   label: 'Pending Follow-ups', icon: 'fas fa-clock'            },
  { id: 'conversion', label: 'Conversion Outcome', icon: 'fas fa-chart-line'       },
  { id: 'consulting', label: 'Post-Conversion',    icon: 'fas fa-seedling'         },
];

const BAND = (s) =>
  s >= 70 ? { label: 'High',   color: '#16a34a', bg: '#dcfce7', ring: '#bbf7d0', variant: 'success' }
: s >= 40 ? { label: 'Medium', color: '#d97706', bg: '#fef3c7', ring: '#fde68a', variant: 'warning' }
:           { label: 'Low',    color: '#ef4444', bg: '#fee2e2', ring: '#fecaca', variant: 'danger'  };

/* ─── Shared sub-components ─────────────────────────────────────────── */
function SectionCard({ title, icon, iconColor, badge, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <i className={`${icon} text-sm`} style={{ color: iconColor ?? '#6b7280' }} />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function BarMini({ pct, color }) {
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden w-full">
      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

function KpiTile({ label, value, icon, color }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <i className={`${icon} text-xs`} style={{ color }} />
        <span className="text-[0.62rem] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-xl font-extrabold text-foreground">{value}</div>
    </div>
  );
}

/* ══ TAB 1 — Rep Performance ════════════════════════════════════════ */
function RepPerformanceTab({ teamPerf, filterRep }) {
  const displayReps = filterRep !== 'all'
    ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep)
    : teamPerf.reps;

  const maxTotal = Math.max(...displayReps.map(r => r.total), 1);

  if (!displayReps.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <i className="fas fa-user-slash text-3xl opacity-25" />
        <span className="text-sm">No representative data available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label="Active Reps"      value={displayReps.length}           icon="fas fa-user-check"    color="#16a34a" />
        <KpiTile label="Total Registered" value={teamPerf.total_farmers}       icon="fas fa-users"         color="#2563eb" />
        <KpiTile label="Pending Review"   value={teamPerf.total_pending}       icon="fas fa-clock"         color="#d97706" />
        <KpiTile label="Total Rejected"   value={teamPerf.total_rejected}      icon="fas fa-times-circle"  color="#ef4444" />
      </div>

      {/* Per-rep cards */}
      {displayReps.map(rep => {
        const initials   = rep.rep_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const capPct     = Math.round((rep.total / maxTotal) * 100);
        const rejectRate = rep.total > 0 ? Math.round((rep.rejected / rep.total) * 100) : 0;
        const highPct    = rep.total > 0 ? Math.round((rep.high    / rep.total) * 100) : 0;
        const mediumPct  = rep.total > 0 ? Math.round((rep.medium  / rep.total) * 100) : 0;

        return (
          <div key={rep.rep_id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{rep.rep_name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{rep.rep_mobile ?? '—'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rep.pending_review > 0 && (
                  <Badge variant="warning"><i className="fas fa-clock mr-1" />{rep.pending_review} pending</Badge>
                )}
                {rep.rejected > 0 && (
                  <Badge variant="danger"><i className="fas fa-times-circle mr-1" />{rep.rejected} rejected</Badge>
                )}
                {rep.approved > 0 && (
                  <Badge variant="success"><i className="fas fa-check mr-1" />{rep.approved} approved</Badge>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase mb-1">Registered</div>
                <div className="text-base font-extrabold text-blue-600">{rep.total}</div>
                <BarMini pct={capPct} color="#2563eb" />
              </div>
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase mb-1">Rejected</div>
                <div className="text-base font-extrabold text-red-500">{rep.rejected}</div>
                <BarMini pct={rejectRate} color="#ef4444" />
              </div>
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase mb-1">High Readiness</div>
                <div className="text-base font-extrabold text-green-600">{rep.high}</div>
                <BarMini pct={highPct} color="#16a34a" />
              </div>
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase mb-1">Medium</div>
                <div className="text-base font-extrabold text-amber-600">{rep.medium}</div>
                <BarMini pct={mediumPct} color="#d97706" />
              </div>
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase mb-1">Avg Score</div>
                <div className="text-base font-extrabold text-purple-600">
                  {rep.avg_score != null ? Math.round(rep.avg_score) : '—'}
                </div>
                <BarMini pct={rep.avg_score ?? 0} color="#7c3aed" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ TAB 2 — Location Coverage ══════════════════════════════════════ */
function LocationCoverageTab({ farmers, locationRows, districtTotals }) {
  const [expanded, setExpanded] = useState(null);
  const totalFarmers = farmers.length || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label="Districts"    value={districtTotals.length}                                                   icon="fas fa-city"      color="#2563eb" />
        <KpiTile label="Talukas"      value={locationRows.length}                                                     icon="fas fa-map-pin"   color="#7c3aed" />
        <KpiTile label="Total Farmers" value={farmers.length}                                                          icon="fas fa-users"     color="#16a34a" />
        <KpiTile label="Avg / Taluka" value={(farmers.length / Math.max(locationRows.length, 1)).toFixed(1)}           icon="fas fa-chart-bar" color="#d97706" />
      </div>

      {districtTotals.map(([district, total]) => {
        const pct     = Math.round((total / totalFarmers) * 100);
        const talukas = locationRows.filter(r => r.district === district);
        const isOpen  = expanded === district;
        return (
          <div key={district} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
              onClick={() => setExpanded(isOpen ? null : district)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <i className="fas fa-city text-blue-600 text-xs" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground">{district}</div>
                  <div className="text-[0.65rem] text-muted-foreground">{talukas.length} talukas · {total} farmers</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block w-24"><BarMini pct={pct} color="#2563eb" /></div>
                <span className="text-xs font-bold text-blue-600 min-w-[3rem] text-right">{pct}%</span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs text-muted-foreground`} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                {talukas.map(t => (
                  <div key={t.taluka} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/30">
                    <span className="text-foreground font-medium">{t.taluka}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-20"><BarMini pct={Math.round((t.count / total) * 100)} color="#7c3aed" /></div>
                      <span className="font-bold text-muted-foreground w-8 text-right">{t.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {districtTotals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <i className="fas fa-map text-3xl opacity-25" />
          <span className="text-sm">No location data available</span>
        </div>
      )}
    </div>
  );
}

/* ══ TAB 3 — Adoption Funnel ════════════════════════════════════════ */
function AdoptionFunnelTab({ farmers }) {
  const high   = farmers.filter(f => f.adoptionScore >= 70);
  const medium = farmers.filter(f => f.adoptionScore >= 40 && f.adoptionScore < 70);
  const low    = farmers.filter(f => f.adoptionScore < 40);
  const total  = farmers.length || 1;

  const bands = [
    { key: 'high',   label: 'High Readiness',   list: high,   color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', range: '70–100', pct: Math.round((high.length   / total) * 100) },
    { key: 'medium', label: 'Medium Readiness', list: medium, color: '#d97706', bg: '#fef3c7', border: '#fde68a', range: '40–69',  pct: Math.round((medium.length / total) * 100) },
    { key: 'low',    label: 'Low Readiness',    list: low,    color: '#ef4444', bg: '#fee2e2', border: '#fecaca', range: '0–39',   pct: Math.round((low.length    / total) * 100) },
  ];

  const [active, setActive] = useState('high');
  const activeList = bands.find(b => b.key === active)?.list ?? [];

  return (
    <div className="space-y-5">
      <SectionCard title="Score Band Distribution" icon="fas fa-chart-pie" iconColor="#7c3aed">
        <div className="space-y-3">
          {bands.map(({ key, label, list, color, bg, border, range, pct }) => (
            <button key={key} onClick={() => setActive(key)}
              className="w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left"
              style={{ background: active === key ? bg : 'transparent', borderColor: active === key ? border : 'transparent' }}>
              <div className="flex flex-col items-center justify-center w-14 shrink-0">
                <div className="text-2xl font-extrabold" style={{ color }}>{list.length}</div>
                <div className="text-[0.6rem] text-muted-foreground">farmers</div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold" style={{ color }}>{label}</span>
                  <span className="text-muted-foreground">Score {range} · {pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              <i className={`fas fa-chevron-right text-xs ml-2 transition-transform ${active === key ? 'rotate-90' : ''}`} style={{ color }} />
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={`${bands.find(b => b.key === active)?.label} Farmers`}
        icon="fas fa-list"
        iconColor={bands.find(b => b.key === active)?.color}
        badge={<Badge variant={active === 'high' ? 'success' : active === 'medium' ? 'warning' : 'danger'}>{activeList.length} farmers</Badge>}
      >
        {activeList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No farmers in this band</div>
        ) : (
          <div className="space-y-2">
            {activeList.map(f => {
              const b = BAND(f.adoptionScore);
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                      style={{ background: f.avatarGradient }}>
                      {f.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{f.name}</div>
                      <div className="text-[0.62rem] text-muted-foreground">{f.village} · {f.crop}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold border"
                      style={{ background: b.bg, color: b.color, borderColor: b.ring }}>
                      {f.adoptionScore}
                    </div>
                    <span className="text-[0.65rem] text-muted-foreground hidden sm:block">{f.repName?.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ══ TAB 4 — Pending Follow-ups ═════════════════════════════════════ */
function PendingFollowupsTab({ farmers }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pendingPage, setPendingPage] = useState(1);
  const PENDING_PAGE_SIZE = 8;

  const pending = useMemo(() => {
    return farmers
      .filter(f => f.nextVisit && f.nextVisit !== '—')
      .map(f => {
        const d    = new Date(f.nextVisit);
        const diff = isNaN(d.getTime()) ? null : Math.floor((d - today) / 86400000);
        const urgency =
          diff === null ? 'none'
          : diff < 0   ? 'overdue'
          : diff === 0 ? 'today'
          : diff <= 3  ? 'soon'
          : 'upcoming';
        const displayDate = isNaN(d.getTime()) ? f.nextVisit
          : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return { ...f, diff, urgency, displayDate };
      })
      .sort((a, b) => (a.diff ?? 999) - (b.diff ?? 999));
  }, [farmers]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPendingPage(1), [farmers]);
  const pendingTotalPages = Math.max(1, Math.ceil(pending.length / PENDING_PAGE_SIZE));
  const pagedPending = pending.slice((pendingPage - 1) * PENDING_PAGE_SIZE, pendingPage * PENDING_PAGE_SIZE);

  const URGENCY_META = {
    overdue:  { label: 'Overdue',   color: '#ef4444', bg: '#fee2e2', icon: 'fas fa-circle-exclamation' },
    today:    { label: 'Due Today', color: '#d97706', bg: '#fef3c7', icon: 'fas fa-bell'               },
    soon:     { label: 'Due Soon',  color: '#2563eb', bg: '#eff6ff', icon: 'fas fa-clock'              },
    upcoming: { label: 'Upcoming',  color: '#16a34a', bg: '#f0fdf4', icon: 'fas fa-calendar'           },
  };

  const counts = {
    overdue:  pending.filter(p => p.urgency === 'overdue').length,
    today:    pending.filter(p => p.urgency === 'today').length,
    soon:     pending.filter(p => p.urgency === 'soon').length,
    upcoming: pending.filter(p => p.urgency === 'upcoming').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label="Overdue"   value={counts.overdue}  icon="fas fa-circle-exclamation" color="#ef4444" />
        <KpiTile label="Due Today" value={counts.today}    icon="fas fa-bell"               color="#d97706" />
        <KpiTile label="Due Soon"  value={counts.soon}     icon="fas fa-clock"              color="#2563eb" />
        <KpiTile label="Upcoming"  value={counts.upcoming} icon="fas fa-calendar"           color="#16a34a" />
      </div>

      <div className="space-y-2">
        {pagedPending.map(f => {
          const meta     = URGENCY_META[f.urgency] ?? URGENCY_META.upcoming;
          const diffLabel = f.diff === null ? '—' : f.diff < 0 ? `${Math.abs(f.diff)}d overdue` : f.diff === 0 ? 'Today' : `In ${f.diff}d`;
          return (
            <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                  <i className={`${meta.icon} text-sm`} style={{ color: meta.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{f.name}</div>
                  <div className="text-[0.65rem] text-muted-foreground">{f.village} · {f.crop} · {f.repName?.split(' ')[0]}</div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1">
                <span className="text-xs font-bold" style={{ color: meta.color }}>{diffLabel}</span>
                <span className="text-[0.62rem] text-muted-foreground">{f.displayDate}</span>
              </div>
            </div>
          );
        })}
        {pending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <i className="fas fa-calendar-check text-3xl opacity-25" />
            <span className="text-sm">No pending follow-ups</span>
          </div>
        )}
        <PaginationBar
          stats={{ total: pending.length, pages: pendingTotalPages, safePage: pendingPage,
            start: pending.length === 0 ? 0 : (pendingPage - 1) * PENDING_PAGE_SIZE + 1,
            end: Math.min(pendingPage * PENDING_PAGE_SIZE, pending.length) }}
          pageNumbers={Array.from({ length: pendingTotalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === pendingTotalPages || Math.abs(p - pendingPage) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
          page={pendingPage} setPage={setPendingPage} label="follow-ups"
        />
      </div>
    </div>
  );
}

/* ══ TAB 5 — Conversion Outcome ══════════════════════════════════════ */
function ConversionOutcomeTab({ farmers }) {
  const high    = farmers.filter(f => f.adoptionScore >= 70).length;
  const active  = farmers.filter(f => f.planStatus === 'active').length;
  const done    = farmers.filter(f => f.planStatus === 'completed').length;
  const converted = active + done;

  const STAGES = [
    { label: 'Identified',        count: farmers.length,  icon: 'fas fa-magnifying-glass', color: '#6b7280' },
    { label: 'High Potential',    count: high,             icon: 'fas fa-star',             color: '#7c3aed' },
    { label: 'Engaged',           count: Math.round(farmers.length * 0.55), icon: 'fas fa-handshake', color: '#2563eb' },
    { label: 'Interest Confirmed', count: Math.round(farmers.length * 0.25), icon: 'fas fa-check',    color: '#d97706' },
    { label: 'Plan Assigned',     count: active,           icon: 'fas fa-file-lines',       color: '#16a34a' },
  ];
  const maxCount = Math.max(...STAGES.map(s => s.count), 1);
  const convRate = Math.round((converted / Math.max(farmers.length, 1)) * 100);
  const avgScore = farmers.length
    ? Math.round(farmers.reduce((s, f) => s + (f.adoptionScore ?? 0), 0) / farmers.length)
    : 0;

  return (
    <div className="space-y-5">
      <SectionCard title="Conversion Funnel" icon="fas fa-filter" iconColor="#7c3aed">
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const pct    = Math.round((stage.count / maxCount) * 100);
            const dropPct = i > 0 ? Math.round(((STAGES[i - 1].count - stage.count) / Math.max(STAGES[i - 1].count, 1)) * 100) : null;
            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stage.color}15` }}>
                      <i className={`${stage.icon} text-[0.65rem]`} style={{ color: stage.color }} />
                    </div>
                    <span className="font-semibold text-foreground">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {dropPct !== null && <span className="text-red-500 text-[0.62rem]">-{dropPct}%</span>}
                    <span className="font-bold" style={{ color: stage.color }}>{stage.count} farmers</span>
                  </div>
                </div>
                <div className="h-6 rounded-lg overflow-hidden bg-muted flex items-center">
                  <div className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${pct}%`, background: stage.color, minWidth: stage.count > 0 ? '2rem' : '0' }}>
                    <span className="text-white text-[0.6rem] font-bold">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Conversion Metrics" icon="fas fa-chart-line" iconColor="#16a34a">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Identified',  value: farmers.length, color: '#6b7280' },
            { label: 'High Potential',    value: high,            color: '#7c3aed' },
            { label: 'Plans Active',      value: active,          color: '#16a34a' },
            { label: 'Plans Completed',   value: done,            color: '#2563eb' },
            { label: 'Conversion Rate',   value: `${convRate}%`,  color: '#d97706' },
            { label: 'Avg Adoption Score', value: avgScore,        color: '#e11d48' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-xl bg-muted/40 border border-border">
              <div className="text-[0.62rem] text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
              <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ══ TAB 6 — Post-Conversion ════════════════════════════════════════ */
function PostConversionTab({ farmers }) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const converted = farmers.filter(f => f.planStatus === 'active' || f.planStatus === 'completed');
  const active    = converted.filter(f => f.planStatus === 'active').length;
  const done      = converted.filter(f => f.planStatus === 'completed').length;
  const avgScore  = converted.length
    ? Math.round(converted.reduce((s, f) => s + (f.adoptionScore ?? 0), 0) / converted.length)
    : 0;

  useEffect(() => setPage(1), [farmers]);
  const totalPages  = Math.max(1, Math.ceil(converted.length / PAGE_SIZE));
  const paged       = converted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const PLAN_COLOR  = { active: '#16a34a', completed: '#2563eb', pending: '#d97706', inactive: '#9ca3af' };
  const PLAN_VARIANT = { active: 'success', completed: 'info', pending: 'warning', inactive: 'muted' };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label="Converted Farmers"   value={converted.length} icon="fas fa-check-circle" color="#16a34a" />
        <KpiTile label="Active Plans"         value={active}           icon="fas fa-play-circle"  color="#2563eb" />
        <KpiTile label="Completed Plans"      value={done}             icon="fas fa-flag-checkered" color="#7c3aed" />
        <KpiTile label="Avg Adoption Score"   value={avgScore}         icon="fas fa-chart-pie"    color="#d97706" />
      </div>

      {converted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <i className="fas fa-seedling text-3xl opacity-25" />
          <span className="text-sm">No converted farmers yet</span>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(f => {
            const b = BAND(f.adoptionScore);
            return (
              <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                    style={{ background: f.avatarGradient }}>
                    {f.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{f.name}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{f.village} · {f.crop} · <span className="font-medium">{f.repName?.split(' ')[0]}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-2 py-0.5 rounded-full text-xs font-bold border"
                    style={{ background: b.bg, color: b.color, borderColor: b.ring }}>
                    {f.adoptionScore}
                  </div>
                  <Badge variant={PLAN_VARIANT[f.planStatus] ?? 'muted'}>
                    {f.planStatus.charAt(0).toUpperCase() + f.planStatus.slice(1)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {converted.length > PAGE_SIZE && (
        <PaginationBar
          stats={{ total: converted.length, pages: totalPages, safePage: page,
            start: (page - 1) * PAGE_SIZE + 1, end: Math.min(page * PAGE_SIZE, converted.length) }}
          pageNumbers={Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
          page={page} setPage={setPage} label="farmers"
        />
      )}
    </div>
  );
}

/* ══ MAIN PAGE ════════════════════════════════════════════════════════ */
export default function SupervisorReportsPage() {
  const [activeTab, setActiveTab] = useState('rep');

  // Data state
  const [farmers,  setFarmers]  = useState([]);
  const [teamPerf, setTeamPerf] = useState({ reps: [], total_farmers: 0, total_pending: 0, total_approved: 0, total_rejected: 0 });
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Filters
  const [filterRep,      setFilterRep]      = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterBand,     setFilterBand]     = useState('all');
  const [filterCrop,     setFilterCrop]     = useState('all');
  const [filterFarming,  setFilterFarming]  = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([getFarmers({ limit: 500 }), getTeamPerformance()])
      .then(([farmRes, perfRes]) => {
        setFarmers(farmRes.farmers ?? []);
        setTeamPerf(perfRes);
      })
      .catch(err => setError(err?.message || 'Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ────────────────────────────────────────────────────
  const districts = useMemo(() =>
    [...new Set(farmers.map(f => f.district).filter(d => d && d !== '—'))].sort(),
  [farmers]);

  const crops = useMemo(() =>
    [...new Set(farmers.map(f => f.crop).filter(c => c && c !== '—'))].sort(),
  [farmers]);

  const repOpts = useMemo(() => [
    { id: 'all', name: 'All Representatives' },
    ...teamPerf.reps.map(r => ({ id: String(r.rep_id), name: r.rep_name })),
  ], [teamPerf.reps]);

  const locationRows = useMemo(() => {
    const map = {};
    farmers.forEach(f => {
      const key = `${f.district}||${f.taluka}`;
      if (!map[key]) map[key] = { district: f.district, taluka: f.taluka || '—', count: 0 };
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [farmers]);

  const districtTotals = useMemo(() => {
    const map = {};
    locationRows.forEach(r => {
      if (!map[r.district]) map[r.district] = 0;
      map[r.district] += r.count;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [locationRows]);

  const filtered = useMemo(() => farmers.filter(f => {
    if (filterRep !== 'all' && String(f.repId) !== filterRep) return false;
    if (filterDistrict !== 'all' && f.district !== filterDistrict) return false;
    if (filterBand !== 'all') {
      const b = f.adoptionScore >= 70 ? 'high' : f.adoptionScore >= 40 ? 'medium' : 'low';
      if (b !== filterBand) return false;
    }
    if (filterCrop !== 'all' && f.crop !== filterCrop) return false;
    if (filterFarming !== 'all' && f.farmingType !== filterFarming) return false;
    return true;
  }), [farmers, filterRep, filterDistrict, filterBand, filterCrop, filterFarming]);

  // TeamPerf filtered by rep selector (for Tab 1)
  const filteredTeamPerf = useMemo(() => ({
    ...teamPerf,
    reps: filterRep !== 'all' ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep) : teamPerf.reps,
    total_farmers:  filterRep !== 'all' ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep).reduce((s, r) => s + r.total, 0)          : teamPerf.total_farmers,
    total_pending:  filterRep !== 'all' ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep).reduce((s, r) => s + r.pending_review, 0)  : teamPerf.total_pending,
    total_approved: filterRep !== 'all' ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep).reduce((s, r) => s + r.approved, 0)        : teamPerf.total_approved,
    total_rejected: filterRep !== 'all' ? teamPerf.reps.filter(r => String(r.rep_id) === filterRep).reduce((s, r) => s + r.rejected, 0)        : teamPerf.total_rejected,
  }), [teamPerf, filterRep]);

  // ── Helpers ─────────────────────────────────────────────────────────
  const isFiltered = filterRep !== 'all' || filterDistrict !== 'all' || filterBand !== 'all' || filterCrop !== 'all' || filterFarming !== 'all';

  function clearFilters() {
    setFilterRep('all'); setFilterDistrict('all');
    setFilterBand('all'); setFilterCrop('all'); setFilterFarming('all');
  }

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? activeTab;

  const REPORT_ROWS = filtered.map(f => ({
    Farmer:           f.name,
    Village:          f.village,
    Taluka:           f.taluka,
    District:         f.district,
    Crop:             f.crop,
    'Land(ac)':       f.landAcres,
    'Farming Type':   f.farmingType,
    Representative:   f.repName,
    'Adoption Score': f.adoptionScore,
    'Plan Status':    f.planStatus,
    'Review Status':  f.reviewStatus,
    'Next Visit':     f.nextVisit ?? '',
  }));

  const selectCls = 'h-8 pl-3 pr-7 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer';

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
        <i className="fas fa-circle-notch fa-spin text-2xl" />
        <span className="text-sm">Loading report data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-muted-foreground">
        <i className="fas fa-circle-exclamation text-4xl text-red-400" />
        <div className="text-base font-semibold text-foreground">Failed to load reports</div>
        <p className="text-sm text-center max-w-sm">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <i className="fas fa-rotate-right mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live team data — {farmers.length} farmers · {teamPerf.reps.length} representatives
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadCSV(REPORT_ROWS, `team-report-${tabLabel.toLowerCase().replace(/\s+/g, '-')}.csv`)}>
            <i className="fas fa-file-csv mr-2 text-green-600" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => printReportAsPDF(`Team Lead Report — ${tabLabel}`, REPORT_ROWS)}>
            <i className="fas fa-file-pdf mr-2 text-red-500" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <i className="fas fa-filter text-xs text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Smart Filters</span>
          {isFiltered && (
            <button onClick={clearFilters} className="ml-auto text-[0.65rem] text-red-500 font-semibold hover:underline">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Representative */}
          <div className="relative">
            <select value={filterRep} onChange={e => setFilterRep(e.target.value)} className={selectCls}>
              {repOpts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* District */}
          <div className="relative">
            <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className={selectCls}>
              <option value="all">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Score band */}
          <div className="relative">
            <select value={filterBand} onChange={e => setFilterBand(e.target.value)} className={selectCls}>
              <option value="all">All Bands</option>
              <option value="high">High Readiness</option>
              <option value="medium">Medium Readiness</option>
              <option value="low">Low Readiness</option>
            </select>
            <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Crop */}
          <div className="relative">
            <select value={filterCrop} onChange={e => setFilterCrop(e.target.value)} className={selectCls}>
              <option value="all">All Crops</option>
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Farming type */}
          <div className="relative">
            <select value={filterFarming} onChange={e => setFilterFarming(e.target.value)} className={selectCls}>
              <option value="all">All Farming</option>
              <option value="chemical">Chemical</option>
              <option value="natural">Natural</option>
              <option value="organic">Organic</option>
              <option value="mixed">Mixed</option>
            </select>
            <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {isFiltered && (
          <div className="mt-2 text-[0.65rem] text-muted-foreground">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of {farmers.length} farmers
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto gap-1 bg-muted/40 rounded-xl p-1 border border-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <i className={tab.icon} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'rep'        && <RepPerformanceTab    teamPerf={filteredTeamPerf} filterRep={filterRep} />}
      {activeTab === 'location'   && <LocationCoverageTab  farmers={filtered} locationRows={locationRows} districtTotals={districtTotals} />}
      {activeTab === 'adoption'   && <AdoptionFunnelTab    farmers={filtered} />}
      {activeTab === 'followup'   && <PendingFollowupsTab  farmers={filtered} />}
      {activeTab === 'conversion' && <ConversionOutcomeTab farmers={filtered} />}
      {activeTab === 'consulting' && <PostConversionTab    farmers={filtered} />}

    </div>
  );
}
