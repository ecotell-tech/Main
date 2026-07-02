/**
 * ModuleAccessContext.jsx — Runtime-configurable module ↔ role access store.
 *
 * Source of truth is the server (form_templates.module_access column).
 * No localStorage — all reads and writes go to the API.
 *
 * ── Load order ───────────────────────────────────────────────────────────────
 *   1. On mount overrides are empty (no localStorage pre-load).  Routes fall
 *      back to their static ROUTE_REGISTRY definitions until the API resolves.
 *   2. When the user is authenticated, GET /form-config is called via
 *      fetchModuleAccess().  The server returns the manager-scoped overrides
 *      which replace in-memory state.
 *   3. If the API is unavailable static defaults remain in effect.
 *
 * ── Save strategy ────────────────────────────────────────────────────────────
 *   setAllModuleRoles / setModuleRoles update in-memory state optimistically
 *   and PUT to the API immediately.  The returned Promise can be awaited by
 *   callers (e.g. PermissionMatrixPage save button) to surface errors.
 *
 * ── Manager bypass ───────────────────────────────────────────────────────────
 *   Manager role is always allowed — overrides never restrict managers.
 */

import {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import { ROLES } from '@constants/roles';
import { fetchModuleAccess, saveModuleAccess } from '@services/moduleAccessService';
import { useAuth } from '@context/AuthContext';

// ── Converters ────────────────────────────────────────────────────────────────

/** Convert the plain API object (path → string[]) to our internal Sets shape. */
function apiToOverrides(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return Object.fromEntries(
    Object.entries(obj).map(([path, arr]) => [
      path,
      new Set(Array.isArray(arr) ? arr : []),
    ]),
  );
}

/** Convert our internal Sets shape to a plain object for the API. */
function overridesToPlain(overrides) {
  return Object.fromEntries(
    Object.entries(overrides).map(([path, set]) => [path, Array.from(set)]),
  );
}

// ── Context ───────────────────────────────────────────────────────────────────
const ModuleAccessContext = createContext(null);

export function ModuleAccessProvider({ children }) {
  const { currentUser } = useAuth();
  // overrides: Record<routePath, Set<roleId>>
  // A path present → that Set is the ONLY allowed roles.
  // A path absent  → fall back to static roles[] from ROUTE_REGISTRY.
  const [overrides, setOverrides] = useState({});

  // ── API load — runs whenever the user logs in / changes ──────────────────
  useEffect(() => {
    if (!currentUser) {
      setOverrides({});
      return;
    }

    let cancelled = false;

    fetchModuleAccess()
      .then((apiData) => {
        if (cancelled || apiData === null) return;
        setOverrides(apiToOverrides(apiData));
      })
      .catch(() => {
        // Non-fatal: keep empty overrides; routes use static registry defaults.
      });

    return () => { cancelled = true; };
  }, [currentUser?.mobile]);

  // ── Access check ─────────────────────────────────────────────────────────

  const canRoleAccess = useCallback(
    (role, routePath, staticRoles = []) => {
      if (role === ROLES.MANAGER) return true;

      if (overrides[routePath] !== undefined) {
        const allowed = overrides[routePath];
        return allowed.size === 0 || allowed.has(role);
      }

      return staticRoles.length === 0 || staticRoles.includes(role);
    },
    [overrides],
  );

  // ── Setters ──────────────────────────────────────────────────────────────

  /**
   * Persist an override for a single route.
   * Pass an empty Set to mean "all roles can access."
   * Returns the API save Promise (can be awaited by caller).
   */
  const setModuleRoles = useCallback((routePath, roleSet) => {
    let plain;
    setOverrides((prev) => {
      const next = { ...prev, [routePath]: new Set(roleSet) };
      plain = overridesToPlain(next);
      return next;
    });
    return saveModuleAccess(plain);
  }, []);

  /**
   * Batch-update all routes at once (called when saving the Module Access matrix).
   * Returns the API save Promise.
   */
  const setAllModuleRoles = useCallback((allModuleRoles) => {
    const next = Object.fromEntries(
      Object.entries(allModuleRoles).map(([path, set]) => [path, new Set(set)]),
    );
    const plain = overridesToPlain(next);
    setOverrides(next);
    return saveModuleAccess(plain);
  }, []);

  /** Wipe all overrides and return to static route-registry defaults. */
  const resetToDefaults = useCallback(() => {
    setOverrides({});
  }, []);

  const getModuleOverride = useCallback(
    (routePath) => overrides[routePath],
    [overrides],
  );

  const hasOverrides = useMemo(() => Object.keys(overrides).length > 0, [overrides]);

  const value = {
    canRoleAccess,
    setModuleRoles,
    setAllModuleRoles,
    resetToDefaults,
    getModuleOverride,
    hasOverrides,
  };

  return (
    <ModuleAccessContext.Provider value={value}>
      {children}
    </ModuleAccessContext.Provider>
  );
}

/**
 * @returns {{
 *   canRoleAccess:    (role: string, routePath: string, staticRoles?: string[]) => boolean,
 *   setModuleRoles:   (routePath: string, roleSet: Set<string>) => Promise<void>,
 *   setAllModuleRoles:(all: Record<string, Set<string>>) => Promise<void>,
 *   resetToDefaults:  () => void,
 *   getModuleOverride:(routePath: string) => Set<string> | undefined,
 *   hasOverrides:     boolean,
 * }}
 */
export function useModuleAccess() {
  const ctx = useContext(ModuleAccessContext);
  if (!ctx) throw new Error('useModuleAccess must be inside <ModuleAccessProvider>');
  return ctx;
}
