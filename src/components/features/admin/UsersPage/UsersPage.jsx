/**
 * UsersPage — User Management (Admin + Manager)
 *
 * Role hierarchy:
 *   Leadership (manager)
 *     └── Manager (admin)          ← leadership can onboard
 *           └── Team Lead (team_lead)  ← manager can onboard
 *                 ├── Agronomist        ← team lead can onboard
 *                 └── Data Entry Operator  ← team lead can onboard
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { PaginationBar } from '@hooks/usePagination';
import { useAuth }  from '@context/AuthContext';
import { useToast } from '@hooks/useToast';
import { getUsers, createUser, updateUser, toggleUserStatus } from '@services/userService';

/* ─── Constants ─────────────────────────────────────────────────── */
const ROLE_META = {
  manager:             { label: 'Leadership',          icon: 'fas fa-crown',                color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  admin:               { label: 'Manager',             icon: 'fas fa-user-shield',          color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
  team_lead:           { label: 'Team Lead',           icon: 'fas fa-users-between-lines',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  // Legacy alias for existing mock data that still uses 'supervisor'
  supervisor:          { label: 'Team Lead',           icon: 'fas fa-users-between-lines',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  agronomist:          { label: 'Field Representative', icon: 'fas fa-leaf',                color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  data_entry_operator: { label: 'Data Entry Operator', icon: 'fas fa-keyboard',             color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
};

const CAN_MANAGE = {
  manager:   ['admin'],
  admin:     ['team_lead'],
  team_lead: ['agronomist', 'data_entry_operator'],
};

const EMPTY_FORM = { name: '', mobile: '', email: '', territory: '', district: '', role: '', reportingTo: '', status: 'active' };

function normalizeUser(u) {
  const meta = ROLE_META[u.role];
  return {
    id:          u.id,
    initials:    u.initials,
    name:        u.name,
    mobile:      u.mobile,
    email:       u.email ?? '',
    role:        u.role,
    reportingTo: u.manager_user_id ?? null,
    designation: meta?.label ?? u.role,
    territory:   u.territory ?? '',
    district:    u.district ?? '',
    status:      u.status,
    joinedDate:  u.joined_date ?? '',
    lastLogin:   'N/A',
    avatarColor: meta?.color
      ? `linear-gradient(135deg,${meta.color},${meta.color}88)`
      : 'linear-gradient(135deg,#6b7280,#374151)',
  };
}

/* ─── Hierarchy tree node ────────────────────────────────────────── */
function UserNode({ user, allUsers, depth = 0, expanded, onToggle }) {
  const meta     = ROLE_META[user.role] ?? { label: user.role, icon: 'fas fa-user', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  const children = allUsers.filter(u => u.reportingTo === user.id);
  const hasKids  = children.length > 0;
  const isOpen   = expanded[user.id] !== false;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl border hover:shadow-sm transition-all cursor-pointer mb-1.5"
        style={{ marginLeft: `${depth * 20}px`, background: meta.bg, borderColor: meta.border }}
        onClick={() => hasKids && onToggle(user.id)}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0"
          style={{ background: user.avatarColor ?? meta.color }}>
          {user.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[0.6rem]" style={{ color: meta.color }}><i className={`${meta.icon} mr-0.5`} />{meta.label}</span>
            {user.territory && <span className="text-[0.6rem] text-muted-foreground">· {user.territory}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[0.6rem] text-muted-foreground hidden sm:block">{user.mobile}</span>
          <Badge variant={user.status === 'active' ? 'success' : 'muted'}>{user.status === 'active' ? 'Active' : 'Inactive'}</Badge>
          {hasKids && <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'} text-[0.55rem] text-muted-foreground`} />}
        </div>
      </div>
      {isOpen && hasKids && children.map(child => (
        <UserNode key={child.id} user={child} allUsers={allUsers} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function UsersPage() {
  const { currentUser } = useAuth();
  const { showToast }   = useToast();
  const role            = currentUser?.role ?? 'admin';

  const canManageRoles = CAN_MANAGE[role] ?? [];

  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modal,     setModal]     = useState(null);
  const [editUser,  setEditUser]  = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState('all');
  const [search,    setSearch]    = useState('');
  const [userPage,  setUserPage]  = useState(1);
  const USER_PAGE_SIZE = 10;
  const [expanded,  setExpanded]  = useState({});

  const reloadUsers = useCallback(() => {
    return getUsers()
      .then(data => setUsers((data ?? []).map(normalizeUser)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadUsers().finally(() => setLoading(false));
  }, [reloadUsers]);

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }

  const visibleUsers = useMemo(() => {
    if (role === 'manager') return users;
    function subtree(id) {
      const direct = users.filter(u => u.reportingTo === id);
      return [...direct, ...direct.flatMap(u => subtree(u.id))];
    }
    const me = users.find(u => u.mobile === currentUser?.mobile);
    return me ? [me, ...subtree(me.id)] : users.filter(u => canManageRoles.includes(u.role));
  }, [users, role, currentUser, canManageRoles]);

  const filtered = useMemo(() => {
    let list = visibleUsers;
    if (activeTab !== 'all') list = list.filter(u => u.role === activeTab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.mobile.includes(q) || u.territory?.toLowerCase().includes(q));
    }
    return list;
  }, [visibleUsers, activeTab, search]);

  useEffect(() => setUserPage(1), [filtered]);

  const userTotalPages  = Math.max(1, Math.ceil(filtered.length / USER_PAGE_SIZE));
  const pagedUsers      = filtered.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE);

  const tabs = useMemo(() => {
    const roleCounts = {};
    visibleUsers.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1; });
    return [
      { id: 'all', label: 'All Users', count: visibleUsers.length },
      ...Object.entries(roleCounts).map(([r, c]) => ({ id: r, label: ROLE_META[r]?.label ?? r, count: c })),
    ];
  }, [visibleUsers]);

  const reportingOptions = useMemo(() => {
    const targetRoles = form.role === 'team_lead' || form.role === 'supervisor' ? ['admin']
      : form.role === 'agronomist' || form.role === 'data_entry_operator' ? ['team_lead']
      : form.role === 'admin' ? ['manager']
      : [];
    return users.filter(u => targetRoles.includes(u.role) && u.status === 'active');
  }, [users, form.role]);

  function openAdd() {
    setEditUser(null);
    // Pre-fill "Reports To" so agronomists get this team lead's form template, not the global one.
    const defaultReportingTo = role === 'team_lead' ? (currentUser?.id ?? '') : '';
    setForm({ ...EMPTY_FORM, role: canManageRoles[0] ?? '', reportingTo: defaultReportingTo });
    setModal('add');
  }

  function openEdit(u) {
    setEditUser(u);
    setForm({ name: u.name, mobile: u.mobile, email: u.email ?? '', territory: u.territory ?? '', district: u.district ?? '', role: u.role, reportingTo: u.reportingTo ?? '', status: u.status });
    setModal('edit');
  }

  async function handleSave() {
    if (!form.name.trim())                              { showToast('Full name is required.',             'error'); return; }
    if (!form.mobile.trim() || form.mobile.length !== 10) { showToast('Valid 10-digit mobile is required.', 'error'); return; }
    if (!form.role)                                     { showToast('Role is required.',                  'error'); return; }

    setSaving(true);
    try {
      if (modal === 'add') {
        await createUser({
          name:            form.name.trim(),
          mobile:          form.mobile,
          email:           form.email || null,
          role:            form.role,
          manager_user_id: form.reportingTo ? Number(form.reportingTo) : null,
          territory:       form.territory || null,
          district:        form.district || null,
          status:          form.status,
        });
        showToast(`${form.name} onboarded. Default password = mobile number.`, 'success');
      } else {
        await updateUser(editUser.id, {
          name:            form.name.trim(),
          email:           form.email || null,
          manager_user_id: form.reportingTo ? Number(form.reportingTo) : null,
          territory:       form.territory || null,
          district:        form.district || null,
          status:          form.status,
        });
        showToast(`${form.name} updated.`, 'success');
      }
      await reloadUsers();
      setModal(null);
    } catch (err) {
      const msg = err?.detail ?? err?.message ?? 'Failed to save. Please try again.';
      showToast(typeof msg === 'string' ? msg : 'Failed to save. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id) {
    try {
      const updated = await toggleUserStatus(id);
      setUsers(prev => prev.map(u => u.id === id ? normalizeUser(updated) : u));
      const label = updated.status === 'active' ? 'activated' : 'deactivated';
      showToast(`User ${label}.`, updated.status === 'active' ? 'success' : 'info');
    } catch {
      showToast('Failed to update status. Try again.', 'error');
    }
  }

  const hierarchyRoots = useMemo(() => {
    if (role === 'manager') return visibleUsers.filter(u => !u.reportingTo);
    const me = visibleUsers.find(u => u.mobile === currentUser?.mobile);
    return me ? [me] : visibleUsers.filter(u => !u.reportingTo);
  }, [visibleUsers, role, currentUser]);

  const inputCls = 'w-full h-9 px-3 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const selCls   = inputCls + ' pr-8 appearance-none';

  return (
    <div id="page-users" className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {role === 'manager' ? 'Manage all system users and onboard new managers' : 'Onboard and manage your team of team leads, agronomists, and operators'}
          </p>
        </div>
        {canManageRoles.length > 0 && (
          <Button variant="primary" onClick={openAdd}>
            <i className="fas fa-user-plus mr-2" /> Onboard User
          </Button>
        )}
      </div>

      {/* Hierarchy tree */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <i className="fas fa-sitemap text-sm text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Organisation Hierarchy</span>
        </div>
        <div className="p-4 overflow-x-auto">
          {hierarchyRoots.map(root => (
            <UserNode key={root.id} user={root} allUsers={visibleUsers} depth={0} expanded={expanded} onToggle={toggleExpand} />
          ))}
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ROLE_META).map(([r, meta]) => (
          <div key={r} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.62rem] font-semibold"
            style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
            <i className={`${meta.icon} text-[0.6rem]`} />
            {meta.label}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(ROLE_META).map(([r, meta]) => {
          const count = visibleUsers.filter(u => u.role === r).length;
          return (
            <div key={r} className="rounded-xl border p-3" style={{ background: meta.bg, borderColor: meta.border }}>
              <div className="flex items-center gap-1.5 mb-1">
                <i className={`${meta.icon} text-xs`} style={{ color: meta.color }} />
                <span className="text-[0.58rem] uppercase tracking-wide font-semibold" style={{ color: meta.color }}>{meta.label.split(' ')[0]}</span>
              </div>
              <div className="text-2xl font-extrabold" style={{ color: meta.color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <i className="fas fa-search text-xs text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" placeholder="Search by name, mobile, territory…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 border border-border overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label.split(' ')[0]}
              <span className={`px-1 rounded-full text-[0.55rem] ${activeTab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['User', 'Role', 'Territory / District', 'Reports To', 'Last Login', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedUsers.map(u => {
                const meta    = ROLE_META[u.role] ?? { label: u.role, icon: 'fas fa-user', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
                const manager = users.find(m => m.id === u.reportingTo);
                const canEdit = canManageRoles.includes(u.role) || u.mobile === currentUser?.mobile;
                return (
                  <tr key={u.id} className={`hover:bg-muted/10 transition-colors ${u.status === 'inactive' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[0.65rem] font-extrabold shrink-0"
                          style={{ background: u.avatarColor ?? meta.color }}>
                          {u.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{u.name}</div>
                          <div className="text-[0.6rem] text-muted-foreground">{u.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full w-fit border"
                        style={{ background: meta.bg, borderColor: meta.border }}>
                        <i className={`${meta.icon} text-[0.55rem]`} style={{ color: meta.color }} />
                        <span className="text-[0.62rem] font-semibold" style={{ color: meta.color }}>{meta.label.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{u.territory ?? '—'}</div>
                      <div className="text-[0.6rem]">{u.district ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {manager ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[0.5rem] font-bold shrink-0"
                            style={{ background: manager.avatarColor ?? '#6b7280' }}>
                            {manager.initials}
                          </div>
                          <span className="text-[0.65rem]">{manager.name.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-[0.65rem]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[0.65rem]">{u.lastLogin}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.status === 'active' ? 'success' : 'muted'}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(u)}
                            className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-[0.62rem] font-semibold transition-colors">
                            <i className="fas fa-pen mr-1" />Edit
                          </button>
                          {u.mobile !== currentUser?.mobile && (
                            <button onClick={() => toggleStatus(u.id)}
                              className={`px-2 py-1 rounded-lg text-[0.62rem] font-semibold transition-colors ${u.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                              {u.status === 'active' ? <><i className="fas fa-ban mr-1" />Deactivate</> : <><i className="fas fa-check mr-1" />Activate</>}
                            </button>
                          )}
                        </div>
                      ) : <span className="text-[0.6rem] text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <i className="fas fa-spinner fa-spin text-lg" />
            <span className="text-sm">Loading users…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <i className="fas fa-users text-2xl opacity-25" />
            <span className="text-sm">No users found</span>
          </div>
        ) : null}
        <PaginationBar
          stats={{ total: filtered.length, pages: userTotalPages, safePage: userPage,
            start: filtered.length === 0 ? 0 : (userPage - 1) * USER_PAGE_SIZE + 1,
            end: Math.min(userPage * USER_PAGE_SIZE, filtered.length) }}
          pageNumbers={Array.from({ length: userTotalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === userTotalPages || Math.abs(p - userPage) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
          page={userPage} setPage={setUserPage} label="users"
        />
      </div>

      {/* Onboard / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="text-base font-extrabold text-foreground">
                {modal === 'add' ? 'Onboard New User' : `Edit — ${editUser?.name}`}
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <i className="fas fa-xmark text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Full Name *</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Mobile * <span className="text-muted-foreground font-normal">(10 digits)</span></label>
                  <input type="tel" placeholder="9XXXXXXXXX" maxLength={10} value={form.mobile}
                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Email</label>
                  <input type="email" placeholder="user@profitportal.in" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Role *</label>
                  <div className="relative">
                    <select value={form.role} onChange={e => {
                      const newRole = e.target.value;
                      // Team leads always own their direct reports — keep their ID pre-selected
                      const autoReporting = role === 'team_lead' ? (currentUser?.id ?? '') : '';
                      setForm(p => ({ ...p, role: newRole, reportingTo: autoReporting }));
                    }} className={selCls} disabled={modal === 'edit'}>
                      <option value="">Select role…</option>
                      {canManageRoles.map(r => (
                        <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Territory</label>
                  <input type="text" placeholder="e.g. Nashik Taluka" value={form.territory}
                    onChange={e => setForm(p => ({ ...p, territory: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">District</label>
                  <input type="text" placeholder="e.g. Nashik" value={form.district}
                    onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className={inputCls} />
                </div>
                {reportingOptions.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Reports To</label>
                    <div className="relative">
                      <select value={form.reportingTo} onChange={e => setForm(p => ({ ...p, reportingTo: e.target.value }))} className={selCls}>
                        <option value="">Select manager…</option>
                        {reportingOptions.map(u => (
                          <option key={u.id} value={u.id}>{u.name} — {ROLE_META[u.role]?.label ?? u.role}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Status</label>
                  <div className="flex gap-4">
                    {['active', 'inactive'].map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="status" value={s} checked={form.status === s}
                          onChange={() => setForm(p => ({ ...p, status: s }))} className="accent-blue-600" />
                        <span className="text-xs text-foreground capitalize">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {modal === 'add' && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <i className="fas fa-circle-info text-blue-600 mt-0.5 text-xs" />
                  <div className="text-xs text-blue-700">
                    Default password = mobile number. User sees a prompt to change it on first login via <strong>Settings → Security</strong>.
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
                  : <><i className="fas fa-save mr-2" />{modal === 'add' ? 'Onboard User' : 'Save Changes'}</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



