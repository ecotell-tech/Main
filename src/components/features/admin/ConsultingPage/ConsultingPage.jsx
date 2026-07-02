/**
 * ConsultingPage — Post-Conversion Organic Consulting (M15)
 * Accessible by: admin (Organic Farming Manager) + manager (Leadership)
 *
 * Each converted farmer is assigned a consultant + start date.
 * Progress is tracked across 4 checkpoints:
 *   1. Irrigation Advisory  2. Fertilizer Schedule
 *   3. Spray Programme      4. Crop-Stage Advisory
 *
 * Status progression: Not Started → Plan Created → In Progress → Completed
 */
import { useState, useMemo, useEffect } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { PaginationBar, SearchInput } from '@hooks/usePagination';
import MOCK_FARMERS from '@data/mock/farmers.json';
import { useToast }  from '@hooks/useToast';

/* ─── Constants ─── */
const CONSULTANTS = [
  'Dr. Ravi Desai',
  'Kavita Mane',
  'Santosh Wagh',
  'Meena Thorat',
  'Ajay Patil',
];

const CHECKPOINTS = [
  { key: 'irrigation',   icon: 'fas fa-droplet',        label: 'Irrigation Advisory',  color: '#2563eb' },
  { key: 'fertilizer',   icon: 'fas fa-seedling',       label: 'Fertilizer Schedule',  color: '#16a34a' },
  { key: 'spray',        icon: 'fas fa-spray-can-sparkles', label: 'Spray Programme',  color: '#d97706' },
  { key: 'cropAdvisory', icon: 'fas fa-wheat-awn',      label: 'Crop-Stage Advisory',  color: '#7c3aed' },
];

const STATUSES = ['Not Started', 'Plan Created', 'In Progress', 'Completed'];

const STATUS_META = {
  'Not Started': { variant: 'muted',    color: '#9ca3af', bg: '#f9fafb' },
  'Plan Created':{ variant: 'info',     color: '#2563eb', bg: '#eff6ff' },
  'In Progress': { variant: 'warning',  color: '#d97706', bg: '#fffbeb' },
  'Completed':   { variant: 'success',  color: '#16a34a', bg: '#f0fdf4' },
};

const CP_STATUS = {
  'not-started': { label: 'Not Started', icon: 'fas fa-clock',        color: '#9ca3af', bg: '#f9fafb'  },
  'plan-created':{ label: 'Plan Created',icon: 'fas fa-file-pen',     color: '#2563eb', bg: '#eff6ff'  },
  'in-progress': { label: 'In Progress', icon: 'fas fa-circle-dot',   color: '#d97706', bg: '#fffbeb'  },
  'completed':   { label: 'Completed',   icon: 'fas fa-circle-check', color: '#16a34a', bg: '#f0fdf4'  },
};

const CP_ORDER = ['not-started', 'plan-created', 'in-progress', 'completed'];

/* ─── Derive converted farmers + seed initial consulting state ─── */
const CONVERTED = MOCK_FARMERS.filter(f =>
  f.planStatus === 'active' || f.planStatus === 'completed'
);

function seedConsultingState() {
  return CONVERTED.map((f, i) => ({
    ...f,
    consultant:  CONSULTANTS[i % CONSULTANTS.length],
    startDate:   `0${(i % 9) + 1} May 2026`,
    overallStatus: i % 4 === 3 ? 'Completed'
      : i % 4 === 2 ? 'In Progress'
      : i % 4 === 1 ? 'Plan Created'
      : 'Not Started',
    checkpoints: {
      irrigation:   i % 4 >= 2 ? 'completed' : i % 4 === 1 ? 'in-progress' : 'not-started',
      fertilizer:   i % 4 >= 3 ? 'completed' : i % 4 === 2 ? 'in-progress' : 'not-started',
      spray:        i % 4 >= 3 ? 'completed' : 'not-started',
      cropAdvisory: i % 4 >= 3 ? 'completed' : 'not-started',
    },
  }));
}

const PAGE_SIZE = 8;

export default function ConsultingPage() {
  const { showToast } = useToast();

  const [records, setRecords]         = useState(seedConsultingState);
  const [search,  setSearch]          = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [consFilter,   setConsFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const [expanded, setExpanded]        = useState(null); // farmer id
  const [editModal, setEditModal]      = useState(null); // { id, consultant, startDate, overallStatus }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter(r => {
      if (statusFilter && r.overallStatus !== statusFilter) return false;
      if (consFilter   && r.consultant    !== consFilter)   return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.village?.toLowerCase().includes(q) && !r.crop?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, search, statusFilter, consFilter]);

  useEffect(() => setPage(1), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ─── Checkpoint advance ─── */
  function advanceCheckpoint(farmerId, cpKey) {
    setRecords(prev => prev.map(r => {
      if (r.id !== farmerId) return r;
      const cur = r.checkpoints[cpKey];
      const nextIdx = CP_ORDER.indexOf(cur) + 1;
      if (nextIdx >= CP_ORDER.length) return r;
      const next = CP_ORDER[nextIdx];
      const updated = { ...r.checkpoints, [cpKey]: next };
      const doneCount = Object.values(updated).filter(v => v === 'completed').length;
      const inProg    = Object.values(updated).some(v => v === 'in-progress');
      const newStatus = doneCount === 4 ? 'Completed'
        : inProg || doneCount > 0 ? 'In Progress'
        : 'Not Started';
      showToast(`${CHECKPOINTS.find(c => c.key === cpKey)?.label} marked as ${CP_STATUS[next].label}.`, 'success');
      return { ...r, checkpoints: updated, overallStatus: newStatus };
    }));
  }

  /* ─── Plan assignment edit ─── */
  function openEdit(r) {
    setEditModal({ id: r.id, consultant: r.consultant, startDate: r.startDate, overallStatus: r.overallStatus });
  }
  function saveEdit() {
    setRecords(prev => prev.map(r => r.id === editModal.id
      ? { ...r, consultant: editModal.consultant, startDate: editModal.startDate, overallStatus: editModal.overallStatus }
      : r));
    showToast('Consulting plan updated.', 'success');
    setEditModal(null);
  }

  /* ─── Summary stats ─── */
  const stats = useMemo(() => ({
    total:      records.length,
    notStarted: records.filter(r => r.overallStatus === 'Not Started').length,
    inProgress: records.filter(r => r.overallStatus === 'In Progress').length,
    completed:  records.filter(r => r.overallStatus === 'Completed').length,
  }), [records]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Post-Conversion Consulting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track 4-checkpoint organic advisory plans for converted farmers
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border px-3 py-2 rounded-lg">
          <i className="fas fa-seedling text-green-600" /> Module M15
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Converted Farmers', value: stats.total,      color: '#2563eb', icon: 'fas fa-users'          },
          { label: 'Not Started',        value: stats.notStarted, color: '#9ca3af', icon: 'fas fa-clock'          },
          { label: 'In Progress',        value: stats.inProgress, color: '#d97706', icon: 'fas fa-circle-dot'     },
          { label: 'Completed',          value: stats.completed,  color: '#16a34a', icon: 'fas fa-circle-check'   },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <i className={`${icon} text-xs`} style={{ color }} />
              <span className="text-[0.62rem] text-muted-foreground uppercase tracking-wide font-semibold">{label}</span>
            </div>
            <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card rounded-xl border border-border px-4 py-3 shadow-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search farmer, village, crop…"
          className="flex-1 min-w-[180px] max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={consFilter}
          onChange={e => setConsFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Consultants</option>
          {CONSULTANTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {records.length} records</span>
      </div>

      {/* Records */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_5rem] items-center px-4 py-3 border-b border-slate-100 bg-slate-50 text-[0.68rem] font-semibold text-slate-500 uppercase tracking-wide">
          <span>Farmer</span>
          <span>Consultant</span>
          <span>Start Date</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {paged.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              <i className="fas fa-search mr-2" />No records match your criteria.
            </div>
          )}
          {paged.map(r => {
            const sm = STATUS_META[r.overallStatus] ?? STATUS_META['Not Started'];
            const doneCount = Object.values(r.checkpoints).filter(v => v === 'completed').length;
            const pct = Math.round((doneCount / 4) * 100);
            const isExpanded = expanded === r.id;

            return (
              <div key={r.id}>
                {/* Row */}
                <div
                  className="px-4 py-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
                  onClick={() => setExpanded(e => e === r.id ? null : r.id)}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                          style={{ background: r.avatarGradient ?? '#4b5563' }}>
                          {r.initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{r.name}</div>
                          <div className="text-[0.65rem] text-muted-foreground">{r.village} · {r.crop}</div>
                        </div>
                      </div>
                      <Badge variant={sm.variant}>{r.overallStatus}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span><i className="fas fa-user-tie mr-1" />{r.consultant}</span>
                      <span><i className="fas fa-calendar mr-1" />{r.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#d97706' }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: pct === 100 ? '#16a34a' : '#d97706' }}>{pct}%</span>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_5rem] items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                        style={{ background: r.avatarGradient ?? '#4b5563' }}>
                        {r.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">{r.name}</div>
                        <div className="text-[0.6rem] text-muted-foreground truncate">{r.village} · {r.crop}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      <i className="fas fa-user-tie mr-1 opacity-60" />{r.consultant}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.startDate}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sm.variant}>{r.overallStatus}</Badge>
                      <span className="text-xs font-bold" style={{ color: pct === 100 ? '#16a34a' : '#d97706' }}>{pct}%</span>
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(r)}
                        className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[0.62rem] font-semibold transition-colors whitespace-nowrap"
                      >
                        <i className="fas fa-pen mr-1" />Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded checkpoint detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-slate-50/60 border-t border-slate-100">
                    <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CHECKPOINTS.map(cp => {
                        const cpSt = r.checkpoints[cp.key] ?? 'not-started';
                        const cpM  = CP_STATUS[cpSt];
                        const isDone = cpSt === 'completed';
                        return (
                          <div key={cp.key} className="rounded-xl border p-3 text-center space-y-2"
                            style={{ background: cpM.bg, borderColor: `${cpM.color}30` }}>
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg mx-auto"
                              style={{ background: `${cp.color}15` }}>
                              <i className={`${cp.icon} text-sm`} style={{ color: cp.color }} />
                            </div>
                            <div className="text-[0.65rem] font-semibold text-foreground">{cp.label}</div>
                            <Badge variant={cpM.label === 'Completed' ? 'success' : cpM.label === 'In Progress' ? 'warning' : cpM.label === 'Plan Created' ? 'info' : 'muted'}>
                              {cpM.label}
                            </Badge>
                            {!isDone && (
                              <button
                                onClick={() => advanceCheckpoint(r.id, cp.key)}
                                className="text-[0.6rem] font-semibold underline underline-offset-2 transition-colors"
                                style={{ color: cp.color }}
                              >
                                <i className="fas fa-arrow-right mr-1" />Advance
                              </button>
                            )}
                            {isDone && (
                              <div className="text-[0.6rem] text-green-600 font-semibold">
                                <i className="fas fa-check mr-1" />Done
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#d97706' }} />
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: pct === 100 ? '#16a34a' : '#d97706' }}>
                        {doneCount}/4 checkpoints — {pct}%
                      </span>
                    </div>

                    {/* Mobile edit button */}
                    <div className="md:hidden mt-3">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors"
                      >
                        <i className="fas fa-pen mr-1.5" />Edit Plan Assignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <PaginationBar
          stats={{ total: filtered.length, pages: totalPages, safePage: page,
            start: filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
            end: Math.min(page * PAGE_SIZE, filtered.length) }}
          pageNumbers={Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
          page={page} setPage={setPage} label="farmers"
        />
      </div>

      {/* Edit Plan Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="text-sm font-extrabold text-foreground">Edit Consulting Plan</div>
              <button onClick={() => setEditModal(null)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
                <i className="fas fa-xmark text-muted-foreground text-sm" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Assigned Consultant</label>
                <select
                  value={editModal.consultant}
                  onChange={e => setEditModal(m => ({ ...m, consultant: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {CONSULTANTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Start Date</label>
                <input
                  type="text"
                  value={editModal.startDate}
                  onChange={e => setEditModal(m => ({ ...m, startDate: e.target.value }))}
                  placeholder="e.g. 01 May 2026"
                  className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Overall Status</label>
                <select
                  value={editModal.overallStatus}
                  onChange={e => setEditModal(m => ({ ...m, overallStatus: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-input rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" className="flex-1" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
