import { useState, useEffect, useMemo } from 'react';
import Button                           from '@common/Button/Button';
import Badge                            from '@common/Badge/Badge';
import Modal                            from '@common/Modal/Modal';
import VisitLogModal                    from '@features/modals/VisitLogModal/VisitLogModal';
import { getVisits, getVisitById }      from '@services/visitService';
import { usePagination, SortTh, PaginationBar, SearchInput } from '@hooks/usePagination';

const STATUS_META = {
  completed: { variant: 'success', label: 'Completed', icon: 'fas fa-circle-check',     color: '#16a34a' },
  pending:   { variant: 'warning', label: 'Pending',   icon: 'fas fa-clock',             color: '#d97706' },
  scheduled: { variant: 'info',    label: 'Scheduled', icon: 'fas fa-calendar-check',    color: '#2563eb' },
  cancelled: { variant: 'muted',   label: 'Cancelled', icon: 'fas fa-circle-xmark',      color: '#6b7280' },
  overdue:   { variant: 'danger',  label: 'Overdue',   icon: 'fas fa-circle-exclamation',color: '#ef4444' },
};

function DetailRow({ icon, label, value, iconColor = '#6b7280' }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50">
        <i className={`${icon} text-xs`} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.63rem] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-foreground break-words">{value || '—'}</div>
      </div>
    </div>
  );
}

function VisitDetailModal({ visit, onClose }) {
  const [detail, setDetail]   = useState(visit);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVisitById(visit.id)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visit.id]);

  const sm = STATUS_META[detail.status] ?? STATUS_META.scheduled;

  const footer = (
    <Button variant="outline" onClick={onClose}>Close</Button>
  );

  return (
    <Modal isOpen onClose={onClose} title="Visit Details" footer={footer}>
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
          <i className="fas fa-circle-notch fa-spin text-lg" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visit code + status banner */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border">
            <div>
              <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wide">Visit Code</div>
              <div className="text-sm font-bold font-mono text-foreground">{detail.code}</div>
            </div>
            <Badge variant={sm.variant}>
              <i className={`${sm.icon} mr-1`} />{sm.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon="fas fa-user"             label="Farmer"       value={detail.farmer}      iconColor="#16a34a" />
            <DetailRow icon="fas fa-seedling"         label="Visit Type"   value={detail.type}        iconColor="#2563eb" />
            <DetailRow icon="fas fa-calendar"         label="Date"         value={detail.date}        iconColor="#d97706" />
            <DetailRow icon="fas fa-map-marker-alt"   label="Location"     value={detail.location}    iconColor="#e11d48" />
            <DetailRow icon="fas fa-user-tie"         label="Conducted By" value={detail.conductedBy} iconColor="#7c3aed" />
          </div>

          {detail.notes && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-note-sticky text-amber-500 text-xs" />
                <span className="text-xs font-semibold text-foreground">Observations / Notes</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{detail.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function VisitLogPage() {
  const [visits,       setVisits]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  async function loadVisits() {
    setLoading(true);
    setError(null);
    try {
      const data = await getVisits();
      setVisits(data);
    } catch {
      setError('Failed to load visits. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVisits(); }, []);

  const visitTypes = useMemo(() => [...new Set(visits.map(v => v.type))].filter(Boolean).sort(), [visits]);

  const {
    search, setSearch, sortKey, sortDir, handleSort,
    page, setPage, sort, paginate, pageNumbers,
  } = usePagination(visits, { pageSize: 10, initialSortKey: 'date' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return visits.filter(v => {
      if (typeFilter   && v.type   !== typeFilter)   return false;
      if (statusFilter && v.status !== statusFilter) return false;
      return !q ||
        (v.farmer   ?? '').toLowerCase().includes(q) ||
        (v.location ?? '').toLowerCase().includes(q) ||
        (v.notes    ?? '').toLowerCase().includes(q) ||
        (v.type     ?? '').toLowerCase().includes(q);
    });
  }, [visits, search, typeFilter, statusFilter]);

  const pageData = paginate(sort(filtered));
  const displayStats = useMemo(() => {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / 10));
    const safe  = Math.min(page, pages);
    return { total, pages, safePage: safe, start: total === 0 ? 0 : (safe - 1) * 10 + 1, end: Math.min(safe * 10, total) };
  }, [filtered, page]);

  return (
    <div id="page-visits" className="space-y-4">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-foreground font-heading">Visit Log</div>
          <div className="text-sm text-muted-foreground mt-0.5">All logged field visits with notes and outcomes</div>
        </div>
        <Button variant="primary" className="shrink-0" onClick={() => setLogModalOpen(true)}>
          <i className="fas fa-plus" aria-hidden="true" /> Log Visit
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <i className="fas fa-circle-exclamation" /> {error}
          <button className="ml-auto underline text-xs" onClick={loadVisits}>Retry</button>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search farmer, location, notes…"
            className="flex-1 min-w-[200px] max-w-sm"
          />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
          >
            <option value="">All Visit Types</option>
            {visitTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-xs text-slate-400 ml-auto">
            {loading ? 'Loading…' : `${displayStats.total} record${displayStats.total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-24" />
                <div className="h-3 bg-slate-100 rounded w-20" />
                <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {pageData.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <i className="fas fa-calendar-xmark mr-2" />No visits match your criteria.
                </div>
              ) : pageData.map(v => {
                const sm = STATUS_META[v.status] ?? STATUS_META.scheduled;
                return (
                  <div key={v.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{v.farmer}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sm.variant}>{sm.label}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setSelected(v)}>
                          <i className="fas fa-eye" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-muted-foreground">
                      {v.location !== '—' && <span><i className="fas fa-map-marker-alt mr-1 opacity-60" />{v.location}</span>}
                      <span><i className="fas fa-calendar mr-1 opacity-60" />{v.date}</span>
                      <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{v.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[750px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-slate-400 w-10 uppercase tracking-wide">#</th>
                    <SortTh label="Farmer"     field="farmer"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide" />
                    <SortTh label="Visit Type" field="type"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide" />
                    <SortTh label="Location"   field="location" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide" />
                    <SortTh label="Date"       field="date"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide" />
                    <SortTh label="Status"     field="status"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide" />
                    <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                        <i className="fas fa-calendar-xmark mr-2" />No visits match your criteria.
                      </td>
                    </tr>
                  ) : pageData.map((v, idx) => {
                    const sm = STATUS_META[v.status] ?? STATUS_META.scheduled;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{displayStats.start + idx}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-foreground">{v.farmer}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">{v.type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{v.location}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{v.date}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sm.variant}>
                            <i className={`${sm.icon} mr-1 text-[0.6rem]`} />{sm.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="blue" size="sm" onClick={() => setSelected(v)} aria-label="View visit details">
                            <i className="fas fa-eye" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar stats={displayStats} pageNumbers={pageNumbers} page={page} setPage={setPage} label="visits" />
          </>
        )}
      </div>

      {/* Log Visit modal */}
      <VisitLogModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSave={() => { setLogModalOpen(false); loadVisits(); }}
      />

      {/* Detail modal */}
      {selected && (
        <VisitDetailModal visit={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
