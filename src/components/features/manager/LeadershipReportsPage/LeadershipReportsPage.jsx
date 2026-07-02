/**
 * LeadershipReportsPage — Performance intelligence for Manager/Leadership role.
 * All data sourced from live API (no mock imports).
 *
 * Tabs:
 *   1. Rep Performance  — daily/weekly productivity per representative
 *   2. Farmer Adoption  — adoption readiness with multi-filter
 *   3. Role Activity    — cross-role summary + recent activity log
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { getTheme }          from '@constants/roleTheme';
import Card                  from '@common/Card/Card';
import Badge                 from '@common/Badge/Badge';
import { PaginationBar }     from '@hooks/usePagination';
import { printReportAsPDF }  from '@/lib/utils';
import { getRepPerformance, getLeadershipStats, getAllActivity } from '@services/dashboardService';
import { getFarmers }        from '@services/farmerService';

const theme = getTheme('manager');

/* ─── CSV helper ─── */
function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  // BOM (﻿) ensures Excel opens the file as UTF-8 without garbled characters.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  // Must be in the DOM for Firefox / Safari to honour the click.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Constants ─── */
const adoptionBand = (score) =>
  score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

const BAND_META = {
  high:   { label: 'High (≥70)',     color: '#16a34a', bg: '#f0fdf4', badge: 'success' },
  medium: { label: 'Medium (40–69)', color: '#d97706', bg: '#fffbeb', badge: 'warning' },
  low:    { label: 'Low (<40)',      color: '#ef4444', bg: '#fef2f2', badge: 'danger'  },
};

const FARMING_LABELS = { chemical: 'Chemical', natural: 'Natural', organic: 'Organic', mixed: 'Mixed' };
const STATUS_BADGE   = { active: 'success', pending: 'warning', completed: 'info' };
const ROLE_COLORS    = {
  Representative: '#16a34a',
  'Data Entry':   '#0d9488',
  'Team Lead':    '#2563eb',
  Admin:          '#7c3aed',
  Manager:        '#dc2626',
};

function inits(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

/* ─── Skeleton ─── */
function LoadingGrid() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <div key={i} className="animate-pulse bg-muted rounded-lg h-20" />)}
      </div>
      <div className="animate-pulse bg-muted rounded-lg h-48" />
      <div className="animate-pulse bg-muted rounded-lg h-64" />
    </div>
  );
}

/* ─── Filter Bar ─── */
function FilterBar({ filters, onChange, reps, districts, talukas, crops }) {
  const sel = (key, val) => onChange({ ...filters, [key]: val });
  const EMPTY = { rep: '', district: '', taluka: '', crop: '', band: '', farmingType: '', planStatus: '' };

  const filterSelect = (label, key, options) => (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <label className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <select
        value={filters[key]}
        onChange={e => sel(key, e.target.value)}
        className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ '--tw-ring-color': theme.accent }}
      >
        <option value="">All</option>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <i className="fas fa-filter text-sm" style={{ color: theme.accent }} />
        <span className="text-xs font-bold text-foreground">Filter Results</span>
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => onChange(EMPTY)}
            className="ml-auto text-[0.65rem] font-semibold underline underline-offset-2"
            style={{ color: theme.accent }}>
            <i className="fas fa-times mr-1" />Clear All
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {filterSelect('Representative', 'rep',         reps)}
        {filterSelect('District',       'district',    districts.map(d => ({ value: d, label: d })))}
        {filterSelect('Taluka',         'taluka',      talukas.map(t => ({ value: t, label: t })))}
        {filterSelect('Crop',           'crop',        crops.map(c => ({ value: c, label: c })))}
        {filterSelect('Score Band',     'band',        Object.entries(BAND_META).map(([k,v]) => ({ value: k, label: v.label })))}
        {filterSelect('Farming Type',   'farmingType', Object.entries(FARMING_LABELS).map(([k,v]) => ({ value: k, label: v })))}
        {filterSelect('Plan Status',    'planStatus',  ['active','pending','completed'].map(s => ({ value: s, label: s })))}
      </div>
    </div>
  );
}

/* ─── TAB 1: Rep Performance ─── */
function RepPerformanceTab({ repPerf, filters, loading }) {
  const [repPage, setRepPage] = useState(1);
  const REP_PAGE_SIZE = 10;

  const rows = useMemo(() => {
    let data = repPerf;
    if (filters.rep) data = data.filter(r => String(r.id) === filters.rep);
    return data;
  }, [repPerf, filters.rep]);

  useEffect(() => setRepPage(1), [filters.rep]);

  if (loading) return <LoadingGrid />;

  const repTotalPages = Math.max(1, Math.ceil(rows.length / REP_PAGE_SIZE));
  const pagedRepRows  = rows.slice((repPage - 1) * REP_PAGE_SIZE, repPage * REP_PAGE_SIZE);
  const maxWeek       = Math.max(1, ...rows.map(r => r.thisWeek));

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: 'fas fa-calendar-day',  label: 'Visits Today',    value: rows.reduce((s,r)=>s+r.today, 0),     color: theme.accent },
          { icon: 'fas fa-calendar-week', label: 'This Week',       value: rows.reduce((s,r)=>s+r.thisWeek, 0),  color: '#2563eb' },
          { icon: 'fas fa-calendar-alt',  label: 'This Month',      value: rows.reduce((s,r)=>s+r.thisMonth, 0), color: '#7c3aed' },
          { icon: 'fas fa-handshake',     label: 'Total Converted', value: rows.reduce((s,r)=>s+r.converted, 0), color: '#16a34a' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
            style={{ borderTopWidth: 2, borderTopColor: color }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <i className={`${icon} text-sm`} style={{ color }} />
            </div>
            <div>
              <div className="text-xl font-extrabold text-foreground">{value}</div>
              <div className="text-[0.65rem] text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <Card>
        <Card.Header title="This-Week Activity by Representative" icon="fas fa-chart-bar" iconStyle={{ color: theme.accent }} />
        <Card.Body>
          {rows.length === 0
            ? <div className="text-center py-8 text-sm text-muted-foreground">No representatives found</div>
            : (
              <div className="space-y-4">
                {rows.map(r => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0"
                          style={{ background: r.status === 'inactive' ? '#9ca3af' : `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                          {inits(r.repName)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{r.repName}</div>
                          <div className="text-muted-foreground text-[0.62rem]">{r.territory}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="font-bold" style={{ color: theme.accent }}>{r.thisWeek} this week</div>
                          <div className="text-[0.62rem] text-muted-foreground">Today: {r.today}</div>
                        </div>
                        <Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round((r.thisWeek / maxWeek) * 100)}%`,
                          background: r.status === 'inactive' ? '#9ca3af' : `linear-gradient(90deg, ${theme.bannerFrom}, ${theme.bannerTo})`
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card.Body>
      </Card>

      {/* Full table */}
      <Card>
        <Card.Header title="Full Representative Performance Table" icon="fas fa-table" iconStyle={{ color: theme.accent }}>
          <span className="text-xs text-muted-foreground">{rows.length} representative{rows.length !== 1 ? 's' : ''}</span>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Representative','Territory','Today','This Week','This Month','Avg Score','Converted','Total Visits','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRepRows.length === 0
                  ? <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">No representatives match the current filter.</td></tr>
                  : pagedRepRows.map(r => (
                    <tr key={r.id}
                      className={`border-b border-border last:border-0 transition-colors ${r.status === 'inactive' ? 'bg-red-50/50' : 'hover:bg-muted/20'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0"
                            style={{ background: r.status === 'inactive' ? '#9ca3af' : `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                            {inits(r.repName)}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{r.repName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.territory}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold ${r.today === 0 ? 'text-red-500' : 'text-green-600'}`}>{r.today}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-foreground">{r.thisWeek}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{r.thisMonth}</td>
                      <td className="px-4 py-3 text-center">
                        {r.avgScore
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: r.avgScore >= 70 ? '#dcfce7' : r.avgScore >= 40 ? '#fef3c7' : '#fee2e2',
                                color:      r.avgScore >= 70 ? '#14532d' : r.avgScore >= 40 ? '#78350f' : '#991b1b'
                              }}>{r.avgScore}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-green-600">{r.converted}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{r.totalVisits}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            stats={{ total: rows.length, pages: repTotalPages, safePage: repPage,
              start: rows.length === 0 ? 0 : (repPage - 1) * REP_PAGE_SIZE + 1,
              end: Math.min(repPage * REP_PAGE_SIZE, rows.length) }}
            pageNumbers={Array.from({ length: repTotalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === repTotalPages || Math.abs(p - repPage) <= 1)
              .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
            page={repPage} setPage={setRepPage} label="representatives"
          />
        </Card.Body>
      </Card>
    </div>
  );
}

/* ─── TAB 2: Farmer Adoption ─── */
function FarmerAdoptionTab({ farmers, filters, loading }) {
  const [farmerPage, setFarmerPage] = useState(1);

  const rows = useMemo(() => farmers.filter(f => {
    if (filters.rep         && String(f.repId)  !== filters.rep)               return false;
    if (filters.district    && f.district        !== filters.district)           return false;
    if (filters.taluka      && f.taluka          !== filters.taluka)             return false;
    if (filters.crop        && f.crop            !== filters.crop)               return false;
    if (filters.band        && adoptionBand(f.adoptionScore) !== filters.band)   return false;
    if (filters.farmingType && f.farmingType     !== filters.farmingType)        return false;
    if (filters.planStatus  && f.planStatus      !== filters.planStatus)         return false;
    return true;
  }), [farmers, filters]);

  useEffect(() => setFarmerPage(1), [filters]);

  if (loading) return <LoadingGrid />;

  const FARMER_PAGE_SIZE = 10;
  const farmerTotalPages = Math.max(1, Math.ceil(rows.length / FARMER_PAGE_SIZE));
  const pagedFarmerRows  = rows.slice((farmerPage - 1) * FARMER_PAGE_SIZE, farmerPage * FARMER_PAGE_SIZE);

  const highCount   = rows.filter(f => adoptionBand(f.adoptionScore) === 'high').length;
  const mediumCount = rows.filter(f => adoptionBand(f.adoptionScore) === 'medium').length;
  const lowCount    = rows.filter(f => adoptionBand(f.adoptionScore) === 'low').length;

  const byDistrict = useMemo(() => {
    const map = {};
    rows.forEach(f => {
      const d = f.district || '—';
      if (!map[d]) map[d] = { district: d, high: 0, medium: 0, low: 0, total: 0 };
      map[d][adoptionBand(f.adoptionScore)]++;
      map[d].total++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);

  const byRep = useMemo(() => {
    const map = {};
    rows.forEach(f => {
      const key = String(f.repId ?? 'unknown');
      if (!map[key]) map[key] = { key, repName: f.repName || '—', high: 0, medium: 0, low: 0, total: 0 };
      map[key][adoptionBand(f.adoptionScore)]++;
      map[key].total++;
    });
    return Object.values(map).sort((a, b) => b.high - a.high);
  }, [rows]);

  return (
    <div className="space-y-5">

      {/* Band summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { band: 'high', count: highCount }, { band: 'medium', count: mediumCount }, { band: 'low', count: lowCount },
        ].map(({ band, count }) => {
          const m = BAND_META[band];
          return (
            <div key={band} className="rounded-2xl border p-5 text-center"
              style={{ background: m.bg, borderColor: `${m.color}30` }}>
              <div className="text-3xl font-extrabold" style={{ color: m.color }}>{count}</div>
              <div className="text-xs font-semibold text-foreground mt-1">{m.label}</div>
              <div className="text-[0.62rem] text-muted-foreground mt-0.5">
                {rows.length ? Math.round((count / rows.length) * 100) : 0}% of filtered
              </div>
            </div>
          );
        })}
      </div>

      {/* District breakdown */}
      {byDistrict.length > 0 && (
        <Card>
          <Card.Header title="Adoption Readiness by District" icon="fas fa-map-location-dot" iconStyle={{ color: theme.accent }} />
          <Card.Body>
            <div className="space-y-4">
              {byDistrict.map(({ district, high, medium, low, total }) => (
                <div key={district}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-foreground">{district}</span>
                    <span className="text-muted-foreground">{total} farmers</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted gap-px">
                    {high   > 0 && <div className="h-full" style={{ width: `${(high/total)*100}%`,   background: '#16a34a' }} />}
                    {medium > 0 && <div className="h-full" style={{ width: `${(medium/total)*100}%`, background: '#d97706' }} />}
                    {low    > 0 && <div className="h-full" style={{ width: `${(low/total)*100}%`,    background: '#ef4444' }} />}
                  </div>
                  <div className="flex gap-3 mt-1 text-[0.62rem] text-muted-foreground">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1 align-middle" />High: {high}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1 align-middle" />Med: {medium}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1 align-middle" />Low: {low}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Rep breakdown */}
      {byRep.length > 0 && (
        <Card>
          <Card.Header title="Adoption Readiness by Representative" icon="fas fa-user-tie" iconStyle={{ color: theme.accent }} />
          <Card.Body className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Representative','Total Farmers','High (≥70)','Medium (40–69)','Low (<40)'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byRep.map(({ key, repName, high, medium, low, total }) => (
                    <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0"
                            style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
                            {inits(repName)}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{repName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-foreground">{total}</td>
                      <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">{high}</span></td>
                      <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{medium}</span></td>
                      <td className="px-4 py-3 text-center"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">{low}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Full farmer list */}
      <Card>
        <Card.Header title="Farmer Adoption Readiness Detail" icon="fas fa-list-check" iconStyle={{ color: theme.accent }}>
          <span className="text-xs text-muted-foreground">{rows.length} record{rows.length !== 1 ? 's' : ''} found</span>
        </Card.Header>
        <Card.Body className="p-0">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <i className="fas fa-filter text-3xl opacity-30" />
              <div className="text-sm">No farmers match the selected filters</div>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden divide-y divide-border">
                {pagedFarmerRows.map(f => {
                  const band = adoptionBand(f.adoptionScore);
                  const bm   = BAND_META[band];
                  return (
                    <div key={f.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: f.avatarGradient }}>
                            {f.initials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{f.name}</div>
                            <div className="text-[0.62rem] text-muted-foreground">{f.taluka}, {f.district}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-extrabold" style={{ color: bm.color }}>{f.adoptionScore || '—'}</div>
                          <Badge variant={bm.badge}>{band}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[0.62rem] text-muted-foreground">
                        <span><i className="fas fa-seedling mr-1" />{f.crop}</span>
                        <span><i className="fas fa-ruler-combined mr-1" />{f.landAcres} ac</span>
                        <span><i className="fas fa-leaf mr-1" />{FARMING_LABELS[f.farmingType] ?? f.farmingType}</span>
                        <span><i className="fas fa-user-tie mr-1" />{f.repName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {['Farmer','Taluka','District','Crop','Land (ac)','Farming Type','Representative','Score','Band','Plan Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[0.68rem] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFarmerRows.map(f => {
                      const band = adoptionBand(f.adoptionScore);
                      const bm   = BAND_META[band];
                      return (
                        <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0"
                                style={{ background: f.avatarGradient }}>
                                {f.initials}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-foreground">{f.name}</div>
                                <div className="text-[0.6rem] text-muted-foreground">{f.mobile}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{f.taluka}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{f.district}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{f.crop}</td>
                          <td className="px-4 py-3 text-xs text-center text-foreground">{f.landAcres}</td>
                          <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{FARMING_LABELS[f.farmingType] ?? f.farmingType}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{f.repName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                              style={{ background: bm.bg, color: bm.color }}>
                              {f.adoptionScore || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3"><Badge variant={bm.badge}>{band}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_BADGE[f.planStatus] ?? 'info'}>{f.planStatus}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {rows.length > 0 && (
            <PaginationBar
              stats={{ total: rows.length, pages: farmerTotalPages, safePage: farmerPage,
                start: (farmerPage - 1) * FARMER_PAGE_SIZE + 1,
                end: Math.min(farmerPage * FARMER_PAGE_SIZE, rows.length) }}
              pageNumbers={Array.from({ length: farmerTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === farmerTotalPages || Math.abs(p - farmerPage) <= 1)
                .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
              page={farmerPage} setPage={setFarmerPage} label="farmers"
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

/* ─── TAB 3: Role Activity ─── */
function RoleActivityTab({ leaderStats, repPerf, allActivity, loading }) {
  if (loading) return <LoadingGrid />;

  const usersBy      = leaderStats?.users_by_role ?? {};
  const totalFarmers = leaderStats?.total_farmers  ?? 0;
  const activeReps   = leaderStats?.active_reps    ?? 0;

  const agros = repPerf.filter(r => r.role === 'agronomist');
  const deos  = repPerf.filter(r => r.role === 'data_entry_operator');

  const topAgro = [...agros].sort((a, b) => b.thisWeek - a.thisWeek)[0];
  const topDeo  = [...deos].sort((a, b) => b.farmers_captured - a.farmers_captured)[0];

  const ROLE_CARDS = [
    {
      role: 'Field Representative', icon: 'fas fa-seedling', color: '#16a34a', bg: '#f0fdf4',
      people:           usersBy['agronomist'] ?? 0,
      weeklyVisits:     agros.reduce((s, r) => s + r.thisWeek, 0),
      farmersCapturing: agros.filter(r => r.farmers_captured > 0).length,
      avgCapture:       agros.length ? `${Math.round(agros.reduce((s,r)=>s+r.converted,0)/agros.length)}/rep` : 'N/A',
      topPerformer:     topAgro
        ? `${topAgro.repName} — ${topAgro.thisWeek} visits this week`
        : 'No activity recorded yet',
    },
    {
      role: 'Team Lead', icon: 'fas fa-users-between-lines', color: '#2563eb', bg: '#eff6ff',
      people:           usersBy['team_lead'] ?? 0,
      weeklyVisits:     0,
      farmersCapturing: totalFarmers,
      avgCapture:       '100%',
      topPerformer:     `Monitoring ${totalFarmers} farmers across ${activeReps} reps`,
    },
    {
      role: 'Manager', icon: 'fas fa-user-shield', color: '#7c3aed', bg: '#faf5ff',
      people:           usersBy['manager'] ?? 0,
      weeklyVisits:     0,
      farmersCapturing: 0,
      avgCapture:       'N/A',
      topPerformer:     `${activeReps} reps onboarded, ${totalFarmers} total farmers`,
    },
    {
      role: 'Data Entry Operator', icon: 'fas fa-keyboard', color: '#0d9488', bg: '#f0fdfa',
      people:           usersBy['data_entry_operator'] ?? 0,
      weeklyVisits:     deos.reduce((s, r) => s + r.thisWeek, 0),
      farmersCapturing: deos.filter(r => r.farmers_captured > 0).length,
      avgCapture:       'N/A',
      topPerformer:     topDeo
        ? `${topDeo.repName} — ${topDeo.farmers_captured} captured`
        : 'No activity recorded yet',
    },
  ];

  return (
    <div className="space-y-5">

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLE_CARDS.map(({ role, icon, color, bg, people, weeklyVisits, farmersCapturing, avgCapture, topPerformer }) => (
          <div key={role} className="rounded-2xl border p-5 space-y-3" style={{ background: bg, borderColor: `${color}25` }}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                <i className={`${icon} text-base`} style={{ color }} />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">{role}</div>
                <div className="text-[0.62rem] text-muted-foreground">{people} member{people !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Members',     val: people },
                { label: 'Visits/Week', val: weeklyVisits || '—' },
                { label: 'Avg Capture', val: avgCapture },
              ].map(({ label, val }) => (
                <div key={label} className="rounded-xl bg-white/60 py-2 px-1">
                  <div className="text-base font-extrabold text-foreground">{val}</div>
                  <div className="text-[0.58rem] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="text-[0.65rem] text-muted-foreground border-t pt-2" style={{ borderColor: `${color}20` }}>
              <i className="fas fa-star mr-1" style={{ color }} />{topPerformer}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity log */}
      <Card>
        <Card.Header title="Recent Activity (All Roles)" icon="fas fa-history" iconStyle={{ color: theme.accent }}>
          <Badge variant="info">Live</Badge>
        </Card.Header>
        <Card.Body>
          {allActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <i className="fas fa-clock-rotate-left text-3xl opacity-30" />
              <div className="text-sm">No activity recorded yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {allActivity.map((log, i) => {
                const color = ROLE_COLORS[log.role] ?? '#6b7280';
                return (
                  <div key={log.id ?? i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-16 shrink-0 text-[0.65rem] text-muted-foreground pt-0.5">{log.time}</div>
                    <div className="w-2 mt-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{log.actor}</span>
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium text-white shrink-0"
                          style={{ background: color }}>
                          {log.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{log.action} — {log.target}</div>
                    </div>
                    <div className="text-[0.62rem] text-muted-foreground shrink-0">{log.date}</div>
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

/* ─── MAIN PAGE ─── */
const TABS = [
  { id: 'rep',      label: 'Rep Performance', icon: 'fas fa-user-tie'            },
  { id: 'adoption', label: 'Farmer Adoption',  icon: 'fas fa-seedling'            },
  { id: 'activity', label: 'Role Activity',    icon: 'fas fa-users-between-lines' },
];

const EMPTY_FILTERS = { rep: '', district: '', taluka: '', crop: '', band: '', farmingType: '', planStatus: '' };

export default function LeadershipReportsPage() {
  const [activeTab,   setActiveTab]   = useState('rep');
  const [filters,     setFilters]     = useState(EMPTY_FILTERS);
  const [repPerf,     setRepPerf]     = useState([]);
  const [farmers,     setFarmers]     = useState([]);
  const [leaderStats, setLeaderStats] = useState(null);
  const [allActivity, setAllActivity] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const printAreaRef = useRef(null);

  useEffect(() => {
    Promise.all([
      getRepPerformance(),
      getFarmers({ limit: 1000 }),
      getLeadershipStats(),
      getAllActivity(50),
    ]).then(([rp, fm, ls, act]) => {
      setRepPerf(rp);
      setFarmers(fm.farmers ?? []);
      setLeaderStats(ls);
      setAllActivity(act);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* Derived filter options from real data */
  const allReps = useMemo(() => {
    const seen = {};
    farmers.forEach(f => { if (f.repId && !seen[f.repId]) seen[f.repId] = f.repName; });
    repPerf.forEach(r => { if (!seen[r.id]) seen[r.id] = r.repName; });
    return Object.entries(seen)
      .map(([id, name]) => ({ value: String(id), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [farmers, repPerf]);

  const allDistricts = useMemo(() =>
    [...new Set(farmers.map(f => f.district).filter(v => v && v !== '—'))].sort(), [farmers]);

  const allTalukas = useMemo(() =>
    [...new Set(farmers.map(f => f.taluka).filter(v => v && v !== '—'))].sort(), [farmers]);

  const allCrops = useMemo(() =>
    [...new Set(farmers.map(f => f.crop).filter(v => v && v !== '—'))].sort(), [farmers]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  /* ── Helpers: build export rows that honour the active filter state ── */
  function getFilteredRepRows() {
    const data = filters.rep ? repPerf.filter(r => String(r.id) === filters.rep) : repPerf;
    return data.map(({ repName, territory, today, thisWeek, thisMonth, avgScore, converted, totalVisits, status }) => ({
      Rep: repName ?? '', Territory: territory ?? '', Today: today,
      'This Week': thisWeek, 'This Month': thisMonth, 'Avg Score': avgScore ?? '',
      Converted: converted, 'Total Visits': totalVisits, Status: status,
    }));
  }

  function getFilteredFarmerRows() {
    const data = farmers.filter(f => {
      if (filters.rep         && String(f.repId)  !== filters.rep)             return false;
      if (filters.district    && f.district        !== filters.district)         return false;
      if (filters.taluka      && f.taluka          !== filters.taluka)           return false;
      if (filters.crop        && f.crop            !== filters.crop)             return false;
      if (filters.band        && adoptionBand(f.adoptionScore) !== filters.band) return false;
      if (filters.farmingType && f.farmingType     !== filters.farmingType)      return false;
      if (filters.planStatus  && f.planStatus      !== filters.planStatus)       return false;
      return true;
    });
    return data.map(({ name, taluka, district, crop, landAcres, farmingType, repName, adoptionScore, planStatus }) => ({
      Farmer: name ?? '', Taluka: taluka ?? '', District: district ?? '', Crop: crop ?? '',
      'Land(ac)': landAcres ?? '', 'Farming Type': FARMING_LABELS[farmingType] ?? farmingType ?? '',
      Representative: repName ?? '', 'Adoption Score': adoptionScore ?? '', 'Plan Status': planStatus ?? '',
    }));
  }

  function getActivityRows() {
    return allActivity.map(({ actor, role, action, target, date, time }) => ({
      Actor: actor ?? '', Role: role ?? '', Action: action ?? '',
      Target: target ?? '', Date: date ?? '', Time: time ?? '',
    }));
  }

  function handleExportPDF() {
    const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? activeTab;
    const rows = activeTab === 'rep'      ? getFilteredRepRows()
               : activeTab === 'adoption' ? getFilteredFarmerRows()
               : getActivityRows();
    printReportAsPDF(`Leadership Report — ${tabLabel}`, rows);
  }

  function handleExportCSV() {
    const filename = activeTab === 'rep'      ? 'rep-performance.csv'
                   : activeTab === 'adoption' ? 'farmer-adoption.csv'
                   : 'role-activity.csv';
    const rows = activeTab === 'rep'      ? getFilteredRepRows()
               : activeTab === 'adoption' ? getFilteredFarmerRows()
               : getActivityRows();
    downloadCSV(rows, filename);
  }

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #leadership-print-area, #leadership-print-area * { visibility: visible; }
          #leadership-print-area { position: fixed; inset: 0; background: white; overflow: auto; padding: 16px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}>
              <i className="fas fa-chart-mixed text-white text-base" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground font-heading">Leadership Reports</h1>
              <p className="text-xs text-muted-foreground">Performance intelligence across all roles and territories</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 shrink-0"
            style={{ background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` }}
            onClick={handleExportPDF}
          >
            <i className="fas fa-file-pdf" /> Export PDF
          </button>
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold border border-border bg-white text-foreground shadow-sm hover:bg-muted/30 transition-colors shrink-0"
            onClick={handleExportCSV}
          >
            <i className="fas fa-file-csv text-green-600" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border w-full sm:w-fit print:hidden">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === id ? 'shadow-sm text-white' : 'text-muted-foreground hover:text-foreground'}`}
            style={activeTab === id ? { background: `linear-gradient(135deg, ${theme.bannerFrom}, ${theme.bannerTo})` } : {}}
          >
            <i className={icon} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        {activeFilterCount > 0 && (
          <div className="flex items-center px-2">
            <span className="text-[0.6rem] font-bold px-2 py-1 rounded-full text-white" style={{ background: theme.accent }}>
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      {activeTab !== 'activity' && (
        <div className="print:hidden">
          <FilterBar
            filters={filters} onChange={setFilters}
            reps={allReps} districts={allDistricts}
            talukas={allTalukas} crops={allCrops}
          />
        </div>
      )}

      {/* Content */}
      <div id="leadership-print-area" ref={printAreaRef}>
        {activeTab === 'rep'      && <RepPerformanceTab repPerf={repPerf}         filters={filters}  loading={loading} />}
        {activeTab === 'adoption' && <FarmerAdoptionTab farmers={farmers}         filters={filters}  loading={loading} />}
        {activeTab === 'activity' && <RoleActivityTab   leaderStats={leaderStats} repPerf={repPerf}  allActivity={allActivity} loading={loading} />}
      </div>
    </div>
  );
}
