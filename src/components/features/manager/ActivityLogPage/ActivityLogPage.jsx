/**
 * ActivityLogPage — Leadership (Manager)
 * Activity tab: real visit events from the API (cross-role).
 * Backup tab: static placeholder (no backup backend yet).
 */
import { useState, useMemo, useEffect } from 'react';
import Badge  from '@common/Badge/Badge';
import Button from '@common/Button/Button';
import { getAllActivity } from '@services/dashboardService';

const ROLE_COLORS = {
  Representative: '#16a34a',
  'Data Entry':   '#0d9488',
  'Team Lead':    '#2563eb',
  Admin:          '#7c3aed',
  Manager:        '#dc2626',
};

const BACKUP_RUNS = [
  { id: 'BK-001', type: 'Full Backup',        date: '03 May 2026', time: '02:00', size: '142 MB', status: 'success', dest: 'S3 · prod-backup' },
  { id: 'BK-002', type: 'Incremental Backup', date: '02 May 2026', time: '02:00', size: '18 MB',  status: 'success', dest: 'S3 · prod-backup' },
  { id: 'BK-003', type: 'Full Backup',        date: '26 Apr 2026', time: '02:00', size: '138 MB', status: 'success', dest: 'S3 · prod-backup' },
  { id: 'BK-004', type: 'Incremental Backup', date: '25 Apr 2026', time: '02:00', size: '5 MB',   status: 'failed',  dest: 'S3 · prod-backup' },
];

export default function ActivityLogPage() {
  const [tab,     setTab]     = useState('activity');
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [fUser,   setFUser]   = useState('all');
  const [fAction, setFAction] = useState('all');
  const [fDate,   setFDate]   = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [fSearch, setFSearch] = useState('');
  const [page,    setPage]    = useState(1);
  const PER_PAGE = 12;

  useEffect(() => {
    getAllActivity(100)
      .then(data => { setLogs(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const uniqueUsers   = useMemo(() => [...new Set(logs.map(l => l.actor))].sort(), [logs]);
  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action))].sort(), [logs]);
  const uniqueDates   = useMemo(() => [...new Set(logs.map(l => l.date))], [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (fUser   !== 'all' && l.actor  !== fUser)   return false;
    if (fAction !== 'all' && l.action !== fAction)  return false;
    if (fDate   !== 'all' && l.date   !== fDate)    return false;
    if (fStatus !== 'all' && l.status !== fStatus)  return false;
    if (fSearch) {
      const q = fSearch.toLowerCase();
      return (
        l.actor.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q)
      );
    }
    return true;
  }), [logs, fUser, fAction, fDate, fStatus, fSearch]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  function clearFilters() {
    setFUser('all'); setFAction('all'); setFDate('all'); setFStatus('all'); setFSearch('');
    setPage(1);
  }
  const isFiltered = fUser !== 'all' || fAction !== 'all' || fDate !== 'all' || fStatus !== 'all' || fSearch;

  function exportCSV() {
    if (!filtered.length) return;
    const headers = ['Actor', 'Role', 'Action', 'Target', 'Date', 'Time', 'Status'];
    const csv = [
      headers.join(','),
      ...filtered.map(l =>
        [`"${l.actor}"`, `"${l.role}"`, `"${l.action}"`, `"${l.target}"`, `"${l.date}"`, `"${l.time}"`, l.status].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'activity-log.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const selCls = 'h-8 pl-3 pr-7 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Activity &amp; Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all user actions, system events, and data backup runs</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <i className="fas fa-file-csv mr-2 text-green-600" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: logs.length,                                    color: '#2563eb', icon: 'fas fa-list' },
          { label: 'Success',      value: logs.filter(l => l.status === 'success').length, color: '#16a34a', icon: 'fas fa-circle-check' },
          { label: 'Failed',       value: logs.filter(l => l.status === 'failed').length,  color: '#ef4444', icon: 'fas fa-circle-exclamation' },
          { label: 'Unique Users', value: uniqueUsers.length,                              color: '#7c3aed', icon: 'fas fa-users' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl bg-muted/40 border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <i className={`${icon} text-xs`} style={{ color }} />
              <span className="text-[0.62rem] text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-xl font-extrabold" style={{ color }}>
              {loading ? <div className="animate-pulse bg-muted rounded w-8 h-5" /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border w-fit">
        {[{ id: 'activity', label: 'Activity Log', icon: 'fas fa-list-check' },
          { id: 'backup',   label: 'Backup Log',   icon: 'fas fa-database'   }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
            <i className={t.icon} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <>
          {/* Filters */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-filter text-xs text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">Filters</span>
              </div>
              {isFiltered && <button onClick={clearFilters} className="text-[0.65rem] text-red-500 font-semibold hover:underline">Clear all</button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="relative sm:col-span-2">
                <i className="fas fa-search text-[0.6rem] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" placeholder="Search actor, action, target…"
                  value={fSearch} onChange={e => { setFSearch(e.target.value); setPage(1); }}
                  className="w-full h-8 pl-7 pr-3 text-xs rounded-lg border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              {[
                { value: fUser,   setter: setFUser,   opts: [['all', 'All Users'],   ...uniqueUsers.map(u   => [u, u])]   },
                { value: fAction, setter: setFAction, opts: [['all', 'All Actions'], ...uniqueActions.map(a => [a, a])]   },
                { value: fDate,   setter: setFDate,   opts: [['all', 'All Dates'],   ...uniqueDates.map(d   => [d, d])]   },
                { value: fStatus, setter: setFStatus, opts: [['all', 'All Status'],  ['success', 'Success'], ['failed', 'Failed']] },
              ].map((f, i) => (
                <div key={i} className="relative">
                  <select value={f.value} onChange={e => { f.setter(e.target.value); setPage(1); }} className={selCls + ' w-full'}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ))}
            </div>
            {isFiltered && (
              <div className="text-[0.65rem] text-muted-foreground">
                Showing <span className="font-bold text-foreground">{filtered.length}</span> of {logs.length} events
              </div>
            )}
          </div>

          {/* Log table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <i className="fas fa-spinner fa-spin text-lg" />
                <span className="text-sm">Loading activity…</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <i className="fas fa-clock-rotate-left text-3xl opacity-30" />
                <div className="text-sm">No activity recorded yet</div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['User', 'Role', 'Action', 'Target', 'Date & Time', 'Status'].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-bold text-muted-foreground uppercase tracking-wide text-[0.6rem]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paged.map((log, i) => {
                        const color = ROLE_COLORS[log.role] ?? '#6b7280';
                        return (
                          <tr key={log.id ?? i} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[0.58rem] font-extrabold shrink-0"
                                  style={{ background: color }}>
                                  {log.initials}
                                </div>
                                <span className="font-medium text-foreground">{log.actor}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{log.role}</td>
                            <td className="px-4 py-3 font-medium text-foreground">{log.action}</td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[8rem] truncate">{log.target}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {log.date}<br /><span className="text-[0.58rem]">{log.time}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                                {log.status === 'success'
                                  ? <><i className="fas fa-check mr-1" />OK</>
                                  : <><i className="fas fa-xmark mr-1" />Fail</>}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
                    <span>Page {page} of {pages}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40">← Prev</button>
                      <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                        className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40">Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'backup' && (
        <div className="space-y-3">
          {BACKUP_RUNS.map(b => (
            <div key={b.id} className="bg-card rounded-2xl border border-border shadow-sm p-4 flex items-center gap-4 flex-wrap">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${b.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                <i className={`fas fa-database text-sm ${b.status === 'success' ? 'text-green-600' : 'text-red-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground">{b.type}</div>
                <div className="text-[0.65rem] text-muted-foreground">{b.dest} · {b.size}</div>
              </div>
              <div className="text-[0.65rem] text-muted-foreground whitespace-nowrap">{b.date} {b.time}</div>
              <Badge variant={b.status === 'success' ? 'success' : 'danger'}>
                {b.status === 'success' ? <><i className="fas fa-check mr-1" />Success</> : <><i className="fas fa-xmark mr-1" />Failed</>}
              </Badge>
              <Badge variant="muted">{b.id}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
