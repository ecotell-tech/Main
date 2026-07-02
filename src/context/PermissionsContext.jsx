/**
 * PermissionsContext.jsx — Runtime-configurable role ↔ permission store.
 *
 * • Defaults come from ROLE_PERMISSIONS in roles.js (the static compile-time map).
 * • Admins can override any role's permission set via the PermissionMatrix screen.
 * • Overrides are persisted to localStorage so they survive page refresh.
 * • ProtectedRoute and any permission gate must use `usePermissions()` —
 *   NOT the static ROLE_PERMISSIONS import — so admin changes take effect immediately.
 *
 * ── Security note ───────────────────────────────────────────────────────
 *   In production, permission overrides MUST come from the server (JWT claims
 *   or an /api/permissions endpoint) and NOT be stored client-side. This
 *   client-only store is for the mock/demo phase only.
 * ────────────────────────────────────────────────────────────────────────
 */

import {
  createContext, useCallback, useContext,
  useMemo, useState,
} from 'react';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@constants/roles';

// Leadership / Manager is the super-user — always gets every permission,
// regardless of any runtime overrides stored in the matrix.
const ALL_PERMISSIONS = new Set(Object.values(PERMISSIONS));

// Roles whose permission sets are locked (cannot be overridden via the matrix).
// Both manager (super-user) and admin (full access, locked in the matrix UI)
// always return ALL_PERMISSIONS regardless of what is in localStorage.
const LOCKED_PERMISSION_ROLES = new Set([ROLES.MANAGER, ROLES.ADMIN]);

// ── Storage key + version (namespace-safe) ───────────────────────────────
// Bump STORAGE_VERSION whenever ROLE_PERMISSIONS or PERMISSIONS are changed so
// that stale client-side overrides are flushed automatically on next load.
const STORAGE_VERSION = 'v2';
const STORAGE_KEY =
  `${import.meta.env.VITE_SESSION_KEY ?? 'pscms_session'}_role_permissions_${STORAGE_VERSION}`;

// ── Helpers ───────────────────────────────────────────────────────────────
function serializeOverrides(overrides) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(overrides).map(([role, set]) => [role, Array.from(set)])
    )
  );
}

function deserializeOverrides(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Object.fromEntries(
      Object.entries(parsed).map(([role, arr]) => [role, new Set(arr)])
    );
  } catch {
    return {};
  }
}

function loadFromStorage() {
  try {
    // Remove any stale keys from older versions so stale permission sets
    // (e.g. admin with 11 permissions before manage_roles was added) never
    // survive an app update and trigger a ProtectedRoute redirect.
    const prefix = `${import.meta.env.VITE_SESSION_KEY ?? 'pscms_session'}_role_permissions`;
    const stale = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((k) => k && k.startsWith(prefix) && k !== STORAGE_KEY);
    stale.forEach((k) => localStorage.removeItem(k));
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserializeOverrides(raw) : {};
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────
const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  // `overrides` maps role → Set<permission> for any role that has been
  // explicitly configured. If a role is absent, the static default is used.
  const [overrides, setOverrides] = useState(() => loadFromStorage());

  /**
   * Merged permissions: overrides win, otherwise fall back to static defaults.
   * Memoised so consumers only re-render when the relevant role changes.
   */
  const effectivePermissions = useMemo(() => {
    const result = {};
    for (const role of Object.values(ROLES)) {
      result[role] =
        overrides[role] !== undefined
          ? overrides[role]
          : ROLE_PERMISSIONS[role] ?? new Set();
    }
    return result;
  }, [overrides]);

  /**
   * Get the current (possibly overridden) permission Set for a role.
   * Locked roles (manager, admin) always return the full permission set —
   * no localStorage override can reduce their access.
   */
  const getRolePermissions = useCallback(
    (role) => {
      if (LOCKED_PERMISSION_ROLES.has(role)) return ALL_PERMISSIONS;
      return effectivePermissions[role] ?? new Set();
    },
    [effectivePermissions]
  );

  /**
   * Persist a new permission Set for a role.
   * Called by PermissionMatrixPage on Save.
   * Locked roles (manager, admin) are ignored — they can never be overridden.
   *
   * @param {string}      role    - A ROLES value
   * @param {Set<string>} permSet - The new full permission set for this role
   */
  const setRolePermissions = useCallback((role, permSet) => {
    if (LOCKED_PERMISSION_ROLES.has(role)) return; // locked — no-op
    setOverrides((prev) => {
      const next = { ...prev, [role]: new Set(permSet) };
      try {
        localStorage.setItem(STORAGE_KEY, serializeOverrides(next));
      } catch (err) {
        console.error('[PermissionsContext] Failed to persist overrides:', err);
      }
      return next;
    });
  }, []);

  /**
   * Batch-update all roles at once (used when saving the full matrix).
   * Locked roles (manager, admin) are stripped before persisting — their
   * permission sets can never be reduced by the matrix UI.
   *
   * @param {Record<string, Set<string>>} allRolePerms
   */
  const setAllRolePermissions = useCallback((allRolePerms) => {
    setOverrides(() => {
      // Strip locked roles — they always use their static defaults.
      const next = Object.fromEntries(
        Object.entries(allRolePerms)
          .filter(([r]) => !LOCKED_PERMISSION_ROLES.has(r))
          .map(([r, s]) => [r, new Set(s)])
      );
      try {
        localStorage.setItem(STORAGE_KEY, serializeOverrides(next));
      } catch (err) {
        console.error('[PermissionsContext] Failed to persist overrides:', err);
      }
      return next;
    });
  }, []);

  /** Reset every role back to the static compile-time defaults. */
  const resetAllToDefaults = useCallback(() => {
    setOverrides({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[PermissionsContext] Failed to clear overrides:', err);
    }
  }, []);

  /** True if any overrides are currently active. */
  const hasOverrides = Object.keys(overrides).length > 0;

  const value = {
    effectivePermissions,
    getRolePermissions,
    setRolePermissions,
    setAllRolePermissions,
    resetAllToDefaults,
    hasOverrides,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * @returns {{
 *   effectivePermissions: Record<string, Set<string>>,
 *   getRolePermissions:   (role: string) => Set<string>,
 *   setRolePermissions:   (role: string, perms: Set<string>) => void,
 *   setAllRolePermissions:(all: Record<string, Set<string>>) => void,
 *   resetAllToDefaults:   () => void,
 *   hasOverrides:         boolean,
 * }}
 */
export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used inside <PermissionsProvider>');
  }
  return ctx;
}
