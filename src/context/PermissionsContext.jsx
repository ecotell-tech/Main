/**
 * PermissionsContext.jsx — Nav/route gating using the signed-in user's real,
 * server-side permission grants.
 *
 * The actual role↔permission matrix lives in the backend `role_permissions`
 * table and is enforced by every API endpoint via `require_permission()`.
 * This context fetches the current user's own effective permission set
 * (GET /auth/permissions) so that ProtectedRoute / Sidebar / BottomNav reflect
 * the same access rules the server enforces — no separate client-side store.
 *
 * Leadership's full editable matrix (all roles) is fetched/saved directly by
 * PermissionMatrixPage via `permissionService.js`, not through this context.
 */

import {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@constants/roles';
import { useAuth } from '@context/AuthContext';
import { getMyPermissions } from '@services/permissionService';

// Leadership / Manager is the super-user — always gets every permission.
// Admin ("Manager" in the UI) is also always fully granted (see backend
// PermissionMatrixService.LOCKED_ROLES) and cannot be restricted.
const ALL_PERMISSIONS = new Set(Object.values(PERMISSIONS));
const LOCKED_PERMISSION_ROLES = new Set([ROLES.MANAGER, ROLES.ADMIN]);

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { currentUser, isAuthenticated } = useAuth();
  // Permission Set for the signed-in user's own role, or null until loaded.
  const [myPermissions, setMyPermissions] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setMyPermissions(null);
      return;
    }
    if (LOCKED_PERMISSION_ROLES.has(currentUser.role)) {
      setMyPermissions(ALL_PERMISSIONS);
      return;
    }
    let cancelled = false;
    getMyPermissions()
      .then((keys) => { if (!cancelled) setMyPermissions(new Set(keys)); })
      .catch((err) => {
        console.error('[PermissionsContext] Failed to load permissions:', err);
        if (!cancelled) setMyPermissions(ROLE_PERMISSIONS[currentUser.role] ?? new Set());
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, currentUser?.id, currentUser?.role]);

  /**
   * Permissions for a role. Only meaningful for the signed-in user's own
   * role (the only role this context has live data for) — falls back to
   * static defaults for any other role, or while the initial fetch is
   * still in flight.
   */
  const getRolePermissions = useCallback(
    (role) => {
      if (LOCKED_PERMISSION_ROLES.has(role)) return ALL_PERMISSIONS;
      if (role === currentUser?.role && myPermissions) return myPermissions;
      return ROLE_PERMISSIONS[role] ?? new Set();
    },
    [currentUser?.role, myPermissions]
  );

  const value = useMemo(() => ({ getRolePermissions }), [getRolePermissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * @returns {{ getRolePermissions: (role: string) => Set<string> }}
 */
export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used inside <PermissionsProvider>');
  }
  return ctx;
}
