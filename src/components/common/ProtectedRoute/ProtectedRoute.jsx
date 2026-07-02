import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { usePermissions } from '@context/PermissionsContext';
import { useModuleAccess } from '@context/ModuleAccessContext';
import { ROLES } from '@constants/roles';
import { ROUTES } from '@constants/routes';

/**
 * ProtectedRoute — wraps routes that require authentication and enforce
 * role/permission-based access control (OWASP A01 — Broken Access Control).
 *
 * Role access is resolved from ModuleAccessContext (Leadership-configurable),
 * which falls back to the static `roles[]` from ROUTE_REGISTRY when no
 * override has been set. Permissions are resolved from PermissionsContext.
 *
 * Behaviour:
 *   • Unauthenticated  → redirect to login
 *   • Module blocked   → redirect to dashboard (403-style)
 *   • Missing perm     → redirect to dashboard (403-style)
 *   • All checks pass  → render children
 *
 * @param {React.ReactNode} children
 * @param {string}          [routePath]           - Route path key for dynamic module-access lookup.
 *                                                  When provided, ModuleAccessContext is the authority.
 * @param {string[]}        [allowedRoles]        - Static fallback (used when routePath is absent).
 * @param {string[]}        [requiredPermissions] - Every listed permission must be held.
 */
export default function ProtectedRoute({
  children,
  routePath = '',
  allowedRoles = [],
  requiredPermissions = [],
}) {
  const { isAuthenticated, currentUser } = useAuth();
  const { getRolePermissions } = usePermissions();
  const { canRoleAccess } = useModuleAccess();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const role = currentUser?.role;
  const isSuperUser = role === ROLES.MANAGER;

  // Module-level access — dynamic (context) when a routePath is supplied,
  // static allowedRoles fallback otherwise.
  if (!isSuperUser) {
    if (routePath) {
      if (!canRoleAccess(role, routePath, allowedRoles)) {
        return <Navigate to={ROUTES.abs.dashboard} replace />;
      }
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      return <Navigate to={ROUTES.abs.dashboard} replace />;
    }
  }

  // Permission check — resolved via PermissionsContext (supports admin overrides)
  if (!isSuperUser && requiredPermissions.length > 0) {
    const userPerms = getRolePermissions(role);
    if (!requiredPermissions.every((p) => userPerms.has(p))) {
      return <Navigate to={ROUTES.abs.dashboard} replace />;
    }
  }

  return children;
}
