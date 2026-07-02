/**
 * PermissionMatrixPage.jsx
 *
 * Two-tab admin screen for Leadership to configure the platform's access model:
 *
 *   Tab 1 — Permission Matrix
 *     Rows = permission keys (grouped by feature area)
 *     Cols = roles
 *     Cells = can this role perform this action?
 *
 *   Tab 2 — Module Access
 *     Rows = visible modules (nav routes from ROUTE_REGISTRY)
 *     Cols = roles
 *     Cells = can this role open this module at all?
 *     Agronomist (Field Rep) is the default/base role shown first.
 *
 * Both tabs persist to localStorage via their respective contexts.
 */

import { useState, useMemo, useCallback } from 'react';
import { usePermissions }   from '@context/PermissionsContext';
import { useModuleAccess }  from '@context/ModuleAccessContext';
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '@constants/roles';
import { ROUTE_REGISTRY } from '@constants/routeRegistry';
import Button  from '@common/Button/Button';
import Badge   from '@common/Badge/Badge';
import { useToast } from '@hooks/useToast';
import { cn } from '@/lib/utils';

// ── Shared role columns ───────────────────────────────────────────────────────
// Agronomist is the default/base role — always listed first.
const ROLE_COLUMNS = [
  { key: ROLES.AGRONOMIST,          label: 'Field Rep',    shortLabel: 'Agro.', icon: 'fas fa-leaf',                  color: '#16a34a', locked: false, superUser: false, isDefault: true  },
  { key: ROLES.TEAM_LEAD,           label: 'Team Lead',    shortLabel: 'TL',    icon: 'fas fa-users-between-lines',  color: '#2563eb', locked: false, superUser: false, isDefault: false },
  { key: ROLES.DATA_ENTRY_OPERATOR, label: 'Data Entry',   shortLabel: 'DEO',   icon: 'fas fa-keyboard',              color: '#d97706', locked: false, superUser: false, isDefault: false },
  { key: ROLES.ADMIN,               label: 'Manager',      shortLabel: 'Mgr',   icon: 'fas fa-user-shield',           color: '#7c3aed', locked: true,  superUser: false, isDefault: false },
  { key: ROLES.MANAGER,             label: 'Leadership',   shortLabel: 'Lead.', icon: 'fas fa-crown',                 color: '#0d9488', locked: true,  superUser: true,  isDefault: false },
];

const LOCKED_ROLES = new Set(ROLE_COLUMNS.filter(r => r.locked).map(r => r.key));

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — Permission Matrix data
// ─────────────────────────────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    label: 'Farmers',
    icon: 'fas fa-users',
    color: '#16a34a',
    items: [
      { key: PERMISSIONS.VIEW_FARMERS,   label: 'View Farmers',    desc: 'Browse & search the farmer list' },
      { key: PERMISSIONS.CREATE_FARMER,  label: 'Register Farmer', desc: 'Register new farmers (manual & bulk import)' },
      { key: PERMISSIONS.EDIT_FARMER,    label: 'Edit Farmer',     desc: 'Update farmer profile & field details' },
      { key: PERMISSIONS.DELETE_FARMER,  label: 'Delete Farmer',   desc: 'Permanently remove a farmer record' },
    ],
  },
  {
    label: 'Visit Log',
    icon: 'fas fa-calendar-check',
    color: '#2563eb',
    items: [
      { key: PERMISSIONS.VIEW_VISITS,  label: 'View Visit Log', desc: 'See all field visit entries' },
      { key: PERMISSIONS.CREATE_VISIT, label: 'Log a Visit',    desc: 'Create new field visit records' },
    ],
  },
  {
    label: 'Adoption Plans',
    icon: 'fas fa-clipboard-list',
    color: '#7c3aed',
    items: [
      { key: PERMISSIONS.VIEW_PLANS,   label: 'View Plans',   desc: 'Read crop adoption plans' },
      { key: PERMISSIONS.CREATE_PLAN,  label: 'Create Plan',  desc: 'Draft new adoption plans' },
      { key: PERMISSIONS.APPROVE_PLAN, label: 'Approve Plan', desc: 'Approve or reject submitted plans' },
    ],
  },
  {
    label: 'Reports & Exports',
    icon: 'fas fa-chart-bar',
    color: '#d97706',
    items: [
      { key: PERMISSIONS.VIEW_REPORTS,   label: 'View Reports',   desc: 'Access analytics dashboards' },
      { key: PERMISSIONS.EXPORT_REPORTS, label: 'Export Reports', desc: 'Download CSV / PDF exports' },
    ],
  },
  {
    label: 'Settings',
    icon: 'fas fa-gear',
    color: '#6b7280',
    items: [
      { key: PERMISSIONS.VIEW_SETTINGS, label: 'View Settings', desc: 'See account and application settings' },
      { key: PERMISSIONS.EDIT_SETTINGS, label: 'Edit Settings', desc: 'Modify settings values' },
    ],
  },
  {
    label: 'Administration',
    icon: 'fas fa-shield-halved',
    color: '#dc2626',
    items: [
      { key: PERMISSIONS.MANAGE_USERS,   label: 'Manage Users',    desc: 'Create, edit, deactivate platform users' },
      { key: PERMISSIONS.MANAGE_ROLES,   label: 'Configure Roles', desc: 'Access this permission matrix screen' },
      { key: PERMISSIONS.VIEW_AUDIT_LOG, label: 'View Audit Log',  desc: 'Access system-wide activity logs' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Module Access data
// ─────────────────────────────────────────────────────────────────────────────
// All non-manager roles (the ones Leadership can toggle)
const CONFIGURABLE_ROLES = ROLE_COLUMNS.filter(c => !c.superUser);

// Only nav-visible routes are meaningful as "modules" Leadership can control
const MODULE_ENTRIES = ROUTE_REGISTRY.filter(r => r.nav).map(r => ({
  path:        r.path,
  label:       r.nav.label,
  icon:        r.nav.icon,
  section:     r.nav.section,
  staticRoles: r.roles,  // [] means all roles
}));

// Expand staticRoles ([] = everyone) into a Set for a given module entry
// so the UI can show the correct default checked state.
function expandStaticRoles(staticRoles) {
  if (staticRoles.length === 0) {
    return new Set(CONFIGURABLE_ROLES.map(c => c.key));
  }
  // Manager is always super-user so only track configurable roles
  return new Set(staticRoles.filter(r => r !== ROLES.MANAGER));
}

function buildModuleDraft(getModuleOverride) {
  const draft = {};
  for (const m of MODULE_ENTRIES) {
    const override = getModuleOverride(m.path);
    draft[m.path] = override !== undefined
      ? new Set([...override].filter(r => r !== ROLES.MANAGER))
      : expandStaticRoles(m.staticRoles);
  }
  return draft;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function MatrixCell({ checked, locked, superUser, dirty, onChange }) {
  if (locked) {
    if (superUser) {
      return (
        <td className="px-4 py-3 text-center">
          <span title="Leadership always has full super-admin access"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal-100 text-teal-600 text-xs">
            <i className="fas fa-crown" />
          </span>
        </td>
      );
    }
    return (
      <td className="px-4 py-3 text-center">
        <span title="Admin always has this permission"
          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-600 text-xs">
          <i className="fas fa-lock" />
        </span>
      </td>
    );
  }

  return (
    <td className="px-4 py-3 text-center">
      <button
        type="button"
        onClick={onChange}
        className={cn(
          'w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all',
          checked
            ? dirty
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
              : 'bg-primary border-primary text-primary-foreground shadow-sm'
            : dirty
              ? 'border-amber-400 bg-amber-50'
              : 'border-border bg-background hover:border-primary/60'
        )}
        aria-label={checked ? 'Revoke access' : 'Grant access'}
      >
        {checked && <i className="fas fa-check text-[9px]" />}
      </button>
    </td>
  );
}

function RoleColHeader({ col, count, total, isDirtyCol, onToggleAll }) {
  return (
    <th className={cn(
      'px-4 py-4 text-center min-w-[110px]',
      col.superUser && 'bg-teal-50/60',
      col.isDefault && 'bg-green-50/40',
    )}>
      <button
        className="flex flex-col items-center gap-1 mx-auto group"
        onClick={onToggleAll}
        title={
          col.superUser ? 'Leadership is super-admin — always has full access'
            : col.locked ? 'Admin always has access to everything'
            : `Click to toggle all for ${col.label}`
        }
      >
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shadow-sm transition-transform group-hover:scale-105',
            col.locked && 'opacity-90'
          )}
          style={{ background: col.color }}
        >
          <i className={col.icon} />
        </div>
        <span className="text-[0.7rem] font-bold text-foreground leading-tight text-center">
          {col.label}
        </span>
        {col.superUser && (
          <span className="text-[0.55rem] font-extrabold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">
            SUPER ADMIN
          </span>
        )}
        {col.isDefault && !col.superUser && (
          <span className="text-[0.55rem] font-extrabold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
            DEFAULT
          </span>
        )}
        <span className={cn(
          'text-[0.6rem] font-medium',
          isDirtyCol ? 'text-amber-600' : 'text-muted-foreground'
        )}>
          {col.locked ? 'All (locked)' : `${count} / ${total}`}
        </span>
        {isDirtyCol && (
          <span className="text-[0.55rem] text-amber-600 font-semibold">
            <i className="fas fa-circle-dot mr-0.5" />unsaved
          </span>
        )}
      </button>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for Permission Matrix
// ─────────────────────────────────────────────────────────────────────────────
function buildPermDraftFromContext(getRolePermissions) {
  const draft = {};
  for (const col of ROLE_COLUMNS) {
    draft[col.key] = new Set(getRolePermissions(col.key));
  }
  return draft;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Permission Matrix
// ─────────────────────────────────────────────────────────────────────────────
function PermissionsTab() {
  const { getRolePermissions, setAllRolePermissions, resetAllToDefaults, hasOverrides } =
    usePermissions();
  const { showToast } = useToast();

  const [draft, setDraft] = useState(() => buildPermDraftFromContext(getRolePermissions));
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirtyRoles = useMemo(() => {
    const result = new Set();
    for (const col of ROLE_COLUMNS) {
      const original = getRolePermissions(col.key);
      if (!setsEqual(draft[col.key], original)) result.add(col.key);
    }
    return result;
  }, [draft, getRolePermissions]);

  const isDirty = dirtyRoles.size > 0;

  const toggle = useCallback((role, perm) => {
    if (LOCKED_ROLES.has(role)) return;
    setDraft(prev => {
      const updated = new Set(prev[role]);
      if (updated.has(perm)) updated.delete(perm);
      else updated.add(perm);
      return { ...prev, [role]: updated };
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setAllRolePermissions(draft);
    setSaving(false);
    showToast('Permission matrix saved successfully.', 'success');
  }

  function handleReset() {
    resetAllToDefaults();
    setDraft(buildPermDraftFromContext((role) => ROLE_PERMISSIONS[role] ?? new Set()));
    setConfirmReset(false);
    showToast('All roles reset to default permissions.', 'success');
  }

  function handleDiscard() {
    setDraft(buildPermDraftFromContext(getRolePermissions));
  }

  function toggleAllForRole(role) {
    if (LOCKED_ROLES.has(role)) return;
    const allPerms = Object.values(PERMISSIONS);
    const hasAll   = allPerms.every(p => draft[role].has(p));
    setDraft(prev => ({
      ...prev,
      [role]: hasAll ? new Set() : new Set(allPerms),
    }));
  }

  const totalPermCount = Object.values(PERMISSIONS).length;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {hasOverrides && (
          <Badge variant="warning">
            <i className="fas fa-triangle-exclamation mr-1" /> Custom config active
          </Badge>
        )}
        {isDirty && (
          <button className="text-xs text-muted-foreground underline underline-offset-2" onClick={handleDiscard}>
            Discard changes
          </button>
        )}
        {!confirmReset ? (
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <i className="fas fa-rotate-left mr-2" /> Reset Defaults
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <i className="fas fa-triangle-exclamation" />
            <span>Reset all roles?</span>
            <button className="font-bold underline" onClick={handleReset}>Yes, reset</button>
            <button className="underline" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
        <Button disabled={!isDirty || saving} onClick={handleSave}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Changes</>
          }
        </Button>
      </div>

      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <i className="fas fa-pencil" />
          <span>Unsaved changes for: <strong>{[...dirtyRoles].map(r => ROLE_COLUMNS.find(c => c.key === r)?.label).join(', ')}</strong></span>
          <span className="ml-1 text-xs opacity-70">— amber = modified</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-56">
                  Permission
                </th>
                {ROLE_COLUMNS.map(col => (
                  <RoleColHeader
                    key={col.key}
                    col={col}
                    count={[...draft[col.key]].length}
                    total={totalPermCount}
                    isDirtyCol={dirtyRoles.has(col.key)}
                    onToggleAll={() => toggleAllForRole(col.key)}
                  />
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/50">
              {PERMISSION_GROUPS.map(group => (
                <>
                  <tr key={`grp-${group.label}`} className="bg-muted/50">
                    <td colSpan={ROLE_COLUMNS.length + 1} className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <i className={`${group.icon} text-xs`} style={{ color: group.color }} />
                        <span className="text-xs font-bold tracking-wide uppercase" style={{ color: group.color }}>
                          {group.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.items.map(item => (
                    <tr key={item.key} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 pl-7">
                        <div className="font-medium text-foreground text-[0.8rem]">{item.label}</div>
                        <div className="text-[0.65rem] text-muted-foreground mt-0.5 leading-tight">{item.desc}</div>
                      </td>
                      {ROLE_COLUMNS.map(col => {
                        const checked   = LOCKED_ROLES.has(col.key) || draft[col.key].has(item.key);
                        const original  = getRolePermissions(col.key).has(item.key);
                        const cellDirty = !LOCKED_ROLES.has(col.key) && checked !== original;
                        return (
                          <MatrixCell
                            key={col.key}
                            checked={checked}
                            locked={LOCKED_ROLES.has(col.key)}
                            superUser={col.superUser}
                            dirty={cellDirty}
                            onChange={() => toggle(col.key, item.key)}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Quick Actions
                </td>
                {ROLE_COLUMNS.map(col => (
                  <td key={col.key} className={cn('px-4 py-3 text-center', col.superUser && 'bg-teal-50/60')}>
                    {col.locked ? (
                      <span className={cn('text-[0.6rem] font-semibold', col.superUser ? 'text-teal-600' : 'text-muted-foreground')}>
                        {col.superUser ? '★ Super Admin' : 'Locked'}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          onClick={() => setDraft(prev => ({ ...prev, [col.key]: new Set(Object.values(PERMISSIONS)) }))}
                          className="text-[0.6rem] text-green-700 hover:underline font-medium"
                        >
                          Grant All
                        </button>
                        <button
                          onClick={() => setDraft(prev => ({ ...prev, [col.key]: new Set() }))}
                          className="text-[0.6rem] text-red-600 hover:underline font-medium"
                        >
                          Revoke All
                        </button>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[0.7rem] text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-primary inline-flex items-center justify-center">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          Granted (saved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-500 inline-flex items-center justify-center">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          Granted (unsaved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border-2 border-amber-400 bg-amber-50 inline-block" />
          Revoked (unsaved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-purple-100 inline-flex items-center justify-center">
            <i className="fas fa-lock text-[8px] text-purple-600" />
          </span>
          Always granted (Admin)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-teal-100 inline-flex items-center justify-center">
            <i className="fas fa-crown text-[8px] text-teal-600" />
          </span>
          Super Admin — Leadership
        </span>
        <span className="ml-auto text-[0.65rem]">
          <i className="fas fa-info-circle mr-1" />
          Click a role header to toggle all.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Module Access
// ─────────────────────────────────────────────────────────────────────────────
function ModuleAccessTab() {
  const { getModuleOverride, setAllModuleRoles, resetToDefaults, hasOverrides } =
    useModuleAccess();
  const { showToast } = useToast();

  const [draft, setDraft]         = useState(() => buildModuleDraft(getModuleOverride));
  const [saving, setSaving]       = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Compute dirty state per module path
  const dirtyPaths = useMemo(() => {
    const result = new Set();
    for (const m of MODULE_ENTRIES) {
      const override = getModuleOverride(m.path);
      const baseline = override !== undefined
        ? new Set([...override].filter(r => r !== ROLES.MANAGER))
        : expandStaticRoles(m.staticRoles);
      if (!setsEqual(draft[m.path], baseline)) result.add(m.path);
    }
    return result;
  }, [draft, getModuleOverride]);

  const isDirty = dirtyPaths.size > 0;

  function toggle(routePath, roleKey) {
    setDraft(prev => {
      const updated = new Set(prev[routePath]);
      if (updated.has(roleKey)) updated.delete(roleKey);
      else updated.add(roleKey);
      return { ...prev, [routePath]: updated };
    });
  }

  function toggleAllForRole(roleKey) {
    const allPaths = MODULE_ENTRIES.map(m => m.path);
    const hasAll   = allPaths.every(p => draft[p].has(roleKey));
    setDraft(prev => {
      const next = { ...prev };
      allPaths.forEach(p => {
        const updated = new Set(next[p]);
        if (hasAll) updated.delete(roleKey);
        else updated.add(roleKey);
        next[p] = updated;
      });
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    // Build full Sets including Manager (super-user always present)
    const payload = Object.fromEntries(
      MODULE_ENTRIES.map(m => [
        m.path,
        new Set([...draft[m.path], ROLES.MANAGER]),
      ])
    );
    setAllModuleRoles(payload);
    setSaving(false);
    showToast('Module access saved successfully.', 'success');
  }

  function handleReset() {
    resetToDefaults();
    setDraft(buildModuleDraft(() => undefined));
    setConfirmReset(false);
    showToast('Module access reset to defaults.', 'success');
  }

  function handleDiscard() {
    setDraft(buildModuleDraft(getModuleOverride));
  }

  // Group MODULE_ENTRIES by section for the table
  const sections = useMemo(() => {
    const map = {};
    for (const m of MODULE_ENTRIES) {
      if (!map[m.section]) map[m.section] = [];
      map[m.section].push(m);
    }
    return Object.entries(map);
  }, []);

  const configurableCols = ROLE_COLUMNS.filter(c => !c.superUser);

  return (
    <div className="space-y-5">

      {/* Description */}
      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
        <i className="fas fa-info-circle mt-0.5 shrink-0" />
        <div>
          <strong>Module Access</strong> controls which roles can open each section of the app.
          The <strong>Field Representative (Agronomist)</strong> is the default base role — it is shown first.
          Leadership always has unrestricted access to every module regardless of this configuration.
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {hasOverrides && (
          <Badge variant="warning">
            <i className="fas fa-triangle-exclamation mr-1" /> Custom module access active
          </Badge>
        )}
        {isDirty && (
          <button className="text-xs text-muted-foreground underline underline-offset-2" onClick={handleDiscard}>
            Discard changes
          </button>
        )}
        {!confirmReset ? (
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <i className="fas fa-rotate-left mr-2" /> Reset Defaults
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <i className="fas fa-triangle-exclamation" />
            <span>Reset all module access?</span>
            <button className="font-bold underline" onClick={handleReset}>Yes, reset</button>
            <button className="underline" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
        <Button disabled={!isDirty || saving} onClick={handleSave}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Changes</>
          }
        </Button>
      </div>

      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <i className="fas fa-pencil" />
          <span>You have unsaved module access changes.</span>
          <span className="ml-1 text-xs opacity-70">— amber = modified</span>
        </div>
      )}

      {/* Module access matrix */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            {/* Column headers */}
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-64">
                  Module
                </th>
                {/* Configurable roles */}
                {configurableCols.map(col => {
                  const accessCount = MODULE_ENTRIES.filter(m => draft[m.path].has(col.key)).length;
                  return (
                    <RoleColHeader
                      key={col.key}
                      col={col}
                      count={accessCount}
                      total={MODULE_ENTRIES.length}
                      isDirtyCol={MODULE_ENTRIES.some(m => dirtyPaths.has(m.path) && (draft[m.path].has(col.key) !== (getModuleOverride(m.path) !== undefined ? [...(getModuleOverride(m.path) ?? [])].filter(r => r !== ROLES.MANAGER).includes(col.key) : expandStaticRoles(m.staticRoles).has(col.key))))}
                      onToggleAll={() => toggleAllForRole(col.key)}
                    />
                  );
                })}
                {/* Leadership — always locked */}
                <th className="px-4 py-4 text-center min-w-[110px] bg-teal-50/60">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shadow-sm" style={{ background: '#0d9488' }}>
                      <i className="fas fa-crown" />
                    </div>
                    <span className="text-[0.7rem] font-bold text-foreground">Leadership</span>
                    <span className="text-[0.55rem] font-extrabold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">SUPER ADMIN</span>
                    <span className="text-[0.6rem] text-muted-foreground">All (locked)</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/50">
              {sections.map(([section, modules]) => (
                <>
                  {/* Section header */}
                  <tr key={`sec-${section}`} className="bg-muted/50">
                    <td colSpan={configurableCols.length + 2} className="px-4 py-2">
                      <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
                        {section}
                      </span>
                    </td>
                  </tr>

                  {modules.map(m => (
                    <tr key={m.path} className="hover:bg-muted/20 transition-colors">
                      {/* Module label */}
                      <td className="px-4 py-3 pl-7">
                        <div className="flex items-center gap-2">
                          <i className={`${m.icon} text-muted-foreground text-xs w-4 text-center`} />
                          <div>
                            <div className="font-medium text-foreground text-[0.82rem]">{m.label}</div>
                            <div className="text-[0.62rem] text-muted-foreground font-mono opacity-60">{m.path}</div>
                          </div>
                        </div>
                        {dirtyPaths.has(m.path) && (
                          <span className="text-[0.6rem] text-amber-600 font-semibold ml-6">
                            <i className="fas fa-circle-dot mr-0.5" />unsaved
                          </span>
                        )}
                      </td>

                      {/* One cell per configurable role */}
                      {configurableCols.map(col => {
                        const checked = draft[m.path].has(col.key);
                        const override = getModuleOverride(m.path);
                        const original = override !== undefined
                          ? [...override].filter(r => r !== ROLES.MANAGER).includes(col.key)
                          : expandStaticRoles(m.staticRoles).has(col.key);
                        const cellDirty = checked !== original;
                        return (
                          <MatrixCell
                            key={col.key}
                            checked={checked}
                            locked={false}
                            superUser={false}
                            dirty={cellDirty}
                            onChange={() => toggle(m.path, col.key)}
                          />
                        );
                      })}

                      {/* Leadership column — always checked, locked */}
                      <td className="px-4 py-3 text-center bg-teal-50/40">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal-100 text-teal-600 text-xs" title="Leadership always has access">
                          <i className="fas fa-crown" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Quick Actions
                </td>
                {configurableCols.map(col => (
                  <td key={col.key} className="px-4 py-3 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <button
                        onClick={() => setDraft(prev => {
                          const next = { ...prev };
                          MODULE_ENTRIES.forEach(m => { next[m.path] = new Set([...next[m.path], col.key]); });
                          return next;
                        })}
                        className="text-[0.6rem] text-green-700 hover:underline font-medium"
                      >
                        Grant All
                      </button>
                      <button
                        onClick={() => setDraft(prev => {
                          const next = { ...prev };
                          MODULE_ENTRIES.forEach(m => { const s = new Set(next[m.path]); s.delete(col.key); next[m.path] = s; });
                          return next;
                        })}
                        className="text-[0.6rem] text-red-600 hover:underline font-medium"
                      >
                        Revoke All
                      </button>
                    </div>
                  </td>
                ))}
                <td className="px-4 py-3 text-center bg-teal-50/60">
                  <span className="text-[0.6rem] font-semibold text-teal-600">★ Super Admin</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[0.7rem] text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-primary inline-flex items-center justify-center">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          Can access (saved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-500 inline-flex items-center justify-center">
            <i className="fas fa-check text-[8px] text-white" />
          </span>
          Can access (unsaved)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border-2 border-border inline-block" />
          Blocked (role cannot open this module)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-teal-100 inline-flex items-center justify-center">
            <i className="fas fa-crown text-[8px] text-teal-600" />
          </span>
          Leadership — always accessible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-green-100 inline-flex items-center justify-center text-green-700 text-[8px] font-bold">D</span>
          Field Rep is the default base role
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root page — tab switcher
// ─────────────────────────────────────────────────────────────────────────────
export default function PermissionMatrixPage() {
  const [activeTab, setActiveTab] = useState('permissions');

  const tabs = [
    { key: 'permissions', label: 'Permission Matrix', icon: 'fas fa-shield-halved' },
    { key: 'modules',     label: 'Module Access',     icon: 'fas fa-grid-2'        },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <div className="text-xl font-bold text-foreground font-heading flex items-center gap-2">
          <i className="fas fa-shield-halved text-primary" />
          Access Control
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure what each role can do (<strong>Permission Matrix</strong>) and which sections of
          the app each role can open (<strong>Module Access</strong>).{' '}
          <strong>Leadership</strong> is the portal super-admin — all access is always granted and cannot be restricted.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'modules'     && <ModuleAccessTab />}
    </div>
  );
}
