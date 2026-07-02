/**
 * ImpersonatePage — Leadership "View As Team Member" screen.
 *
 * Full DataTable with:
 *   - Global search (name / mobile / designation / territory / district)
 *   - Role-filter tabs with live counts
 *   - Sortable columns (click header to toggle asc/desc)
 *   - Pagination — 10 rows per page, handles thousands of users
 *   - Two action buttons per row:
 *       "View As"  → same tab (standard impersonation via AuthContext)
 *       "New Tab"  → writes a short-lived localStorage token that the new
 *                    tab's AuthContext picks up on init to bootstrap impersonation
 *
 * Security: only role === 'manager' can reach this page (routeRegistry).
 */
import { useState, useEffect }              from 'react';
import { useAuth, PENDING_IMPERSONATE_KEY } from '@context/AuthContext';
import { getTheme }                         from '@constants/roleTheme';
import { getUsers }                         from '@services/userService';
import { getToken }                         from '@services/api';

const theme = getTheme('manager');

/* ── Role display meta ─────────────────────────────────────────────── */
const ROLE_META = {
  admin: {
    label:  'Manager',
    icon:   'fas fa-user-shield',
    color:  '#7c3aed',
    bg:     '#faf5ff',
    border: '#ddd6fe',
  },
  team_lead: {
    label:  'Team Lead',
    icon:   'fas fa-users-between-lines',
    color:  '#2563eb',
    bg:     '#eff6ff',
    border: '#bfdbfe',
  },
  // Legacy alias for existing mock/stored data
  supervisor: {
    label:  'Team Lead',
    icon:   'fas fa-users-between-lines',
    color:  '#2563eb',
    bg:     '#eff6ff',
    border: '#bfdbfe',
  },
  agronomist: {
    label:  'Field Representative',
    icon:   'fas fa-leaf',
    color:  '#16a34a',
    bg:     '#f0fdf4',
    border: '#bbf7d0',
  },
  data_entry_operator: {
    label:  'Data Entry Operator',
    icon:   'fas fa-keyboard',
    color:  '#d97706',
    bg:     '#fffbeb',
    border: '#fde68a',
  },
};

const ROLE_TABS = [
  { key: 'all',                 label: 'All Members'  },
  { key: 'admin',               label: 'Manager'      },
  { key: 'team_lead',           label: 'Team Lead'    },
  { key: 'agronomist',          label: 'Field Rep'    },
  { key: 'data_entry_operator', label: 'Data Entry'   },
];

const PAGE_SIZE = 10;

function avatarInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}

/* ── Sortable column header ─────────────────────────────────────────── */
function SortTh({ label, field, sortKey, sortDir, onSort }) {
  const active = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors ${
        active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      <i
        className={`ml-1.5 text-[9px] fas ${
          active
            ? sortDir === 'asc' ? 'fa-sort-up text-blue-600' : 'fa-sort-down text-blue-600'
            : 'fa-sort text-slate-300'
        }`}
      />
    </th>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ImpersonatePage() {
  const { currentUser } = useAuth();

  const [allUsers,   setAllUsers]   = useState([]);
  const [loadingU,   setLoadingU]   = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortKey,    setSortKey]    = useState('name');
  const [sortDir,    setSortDir]    = useState('asc');
  const [page,       setPage]       = useState(1);

  useEffect(() => {
    getUsers()
      .then(users => {
        setAllUsers((users ?? []).filter(u => u.role !== 'manager'));
        setLoadingU(false);
      })
      .catch(() => setLoadingU(false));
  }, []);

  function handleSort(field) {
    if (sortKey === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortDir('asc'); }
    setPage(1);
  }
  function handleTabChange(key) { setRoleFilter(key); setPage(1); }
  function handleSearchChange(e) { setSearch(e.target.value); setPage(1); }
  function clearSearch() { setSearch(''); setPage(1); }

  /* Login — new browser tab via short-lived localStorage handshake */
  function handleViewAsNewTab(user) {
    localStorage.setItem(
      PENDING_IMPERSONATE_KEY,
      JSON.stringify({ user, realUser: currentUser, token: getToken(), ts: Date.now(), nonce: crypto.randomUUID() }),
    );
    window.open('/app/dashboard', '_blank', 'noopener');
  }

  /* ── Filter ── */
  const q = search.toLowerCase().trim();
  const filtered = allUsers.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch =
      !q ||
      (u.name        ?? '').toLowerCase().includes(q) ||
      (u.mobile      ?? '').includes(q) ||
      (u.designation ?? '').toLowerCase().includes(q) ||
      (u.territory   ?? '').toLowerCase().includes(q) ||
      (u.district    ?? '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  /* ── Sort ── */
  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '').toLowerCase();
    const bv = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  /* ── Paginate ── */
  const totalRows  = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safeP      = Math.min(page, totalPages);
  const pageData   = sorted.slice((safeP - 1) * PAGE_SIZE, safeP * PAGE_SIZE);

  const countFor = (key) =>
    key === 'all' ? allUsers.length : allUsers.filter(u => u.role === key).length;

  /* Pagination page-number array with ellipsis */
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - safeP) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="space-y-5">

      {/* ── Hero banner ── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.sidebarFrom} 0%, ${theme.bannerTo} 100%)` }}
      >
        <div
          className="absolute -right-10 -top-10 w-44 h-44 rounded-full opacity-10"
          style={{ background: theme.accent }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <i className="fas fa-binoculars" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">View As Team Member</h1>
              <p className="text-sm text-white/60 mt-0.5">
                Step into any colleague's workspace — read-only observer mode
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <i className="fas fa-shield-halved" />
              Read-only — no data modified
            </span>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <i className="fas fa-users" />
              {allUsers.length} team members
            </span>
          </div>
        </div>

        {/* How it works — 3 steps */}
        <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: 'fas fa-table-list',         title: 'Find member',        desc: 'Search or filter the table by name, mobile, or territory.' },
            { icon: 'fas fa-eye',                title: 'Login',              desc: 'Click "Login" to open the member\'s workspace in a new tab.'      },
            { icon: 'fas fa-right-from-bracket', title: 'Exit anytime',       desc: 'Use the navy banner at the top to return to Leadership.'      },
          ].map(s => (
            <div
              key={s.title}
              className="flex items-start gap-2.5 rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <i className={s.icon} />
              </div>
              <div>
                <div className="text-xs font-semibold">{s.title}</div>
                <div className="text-[0.68rem] text-white/55 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DataTable card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 pt-4 pb-0 border-b border-slate-100 space-y-3">

          {/* Search */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search name, mobile, territory…"
                className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 text-[9px] transition"
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {totalRows} result{totalRows !== 1 ? 's' : ''}
              {search && <> for <span className="text-blue-500 font-medium">"{search}"</span></>}
            </span>
          </div>

          {/* Role filter tabs */}
          <div className="flex items-end gap-0.5 overflow-x-auto">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                  roleFilter === tab.key
                    ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className={`min-w-[18px] text-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  roleFilter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {countFor(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[0.7rem] font-semibold text-slate-400 w-10 uppercase tracking-wide">#</th>
                <SortTh label="Team Member" field="name"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Role"        field="role"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Designation" field="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Territory"   field="territory"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Status"      field="status"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <i className="fas fa-users-slash text-4xl text-slate-200 block mb-3" />
                    <p className="text-sm text-slate-400">No team members match your criteria.</p>
                    {(search || roleFilter !== 'all') && (
                      <button
                        onClick={() => { clearSearch(); setRoleFilter('all'); }}
                        className="mt-2 text-xs text-blue-500 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : pageData.map((user, idx) => {
                const meta = ROLE_META[user.role] ?? ROLE_META.agronomist;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">

                    {/* Row number */}
                    <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">
                      {(safeP - 1) * PAGE_SIZE + idx + 1}
                    </td>

                    {/* Team member — avatar + name + mobile */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                          style={{ background: user.avatarColor ?? meta.color }}
                        >
                          {user.initials ?? avatarInitials(user.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm leading-tight">{user.name}</div>
                          <div className="text-[0.7rem] text-slate-400 mt-0.5 font-mono">{user.mobile}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                      >
                        <i className={`${meta.icon} text-[9px]`} />
                        {meta.label}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {user.designation ?? <span className="text-slate-300">—</span>}
                    </td>

                    {/* Territory */}
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {user.territory
                        ? <><i className="fas fa-location-dot mr-1.5 text-slate-300" />{user.territory}</>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
                        }`} />
                        {user.status ?? 'active'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        <button
                          onClick={() => handleViewAsNewTab(user)}
                          title="Open in new browser tab"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold border transition-all hover:bg-slate-50 active:scale-95 whitespace-nowrap"
                          style={{ borderColor: meta.border, color: meta.color }}
                        >
                          <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                          Login
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <span className="text-xs text-slate-400">
            {totalRows === 0
              ? 'No results'
              : `${(safeP - 1) * PAGE_SIZE + 1}–${Math.min(safeP * PAGE_SIZE, totalRows)} of ${totalRows} member${totalRows !== 1 ? 's' : ''}`}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={safeP === 1} onClick={() => setPage(1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 disabled:cursor-not-allowed transition">
                <i className="fas fa-angles-left text-[10px]" />
              </button>
              <button disabled={safeP === 1} onClick={() => setPage(p => p - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 disabled:cursor-not-allowed transition">
                <i className="fas fa-angle-left text-[10px]" />
              </button>

              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`el-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs border font-medium transition ${
                      safeP === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}>
                    {p}
                  </button>
                )
              )}

              <button disabled={safeP === totalPages} onClick={() => setPage(p => p + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 disabled:cursor-not-allowed transition">
                <i className="fas fa-angle-right text-[10px]" />
              </button>
              <button disabled={safeP === totalPages} onClick={() => setPage(totalPages)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-xs border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-100 disabled:cursor-not-allowed transition">
                <i className="fas fa-angles-right text-[10px]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer notice */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <i className="fas fa-circle-info mt-0.5 text-slate-400 shrink-0" />
        <span>
          Click <strong>Login</strong> to open any member's workspace in a new browser tab — so you can keep the Leadership
          view open alongside. In both cases you are a <strong>read-only observer</strong>.
          The navy banner at the top always lets you exit back to Leadership mode.
        </span>
      </div>

    </div>
  );
}
