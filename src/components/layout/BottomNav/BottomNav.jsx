import { NavLink } from 'react-router-dom';
import { ROUTES }           from '@constants/routes';
import { useAuth }          from '@context/AuthContext';
import { usePermissions }   from '@context/PermissionsContext';
import { useModuleAccess }  from '@context/ModuleAccessContext';
import { getNavForRole }    from '@constants/routeRegistry';

export default function BottomNav() {
  const { currentUser } = useAuth();
  const { getRolePermissions } = usePermissions();
  const { canRoleAccess } = useModuleAccess();
  const role = currentUser?.role ?? '';
  const userPermissions = Array.from(getRolePermissions(role));
  const navGroups = getNavForRole(role, userPermissions, canRoleAccess);
  // Flatten all nav items and take the first 5 for bottom nav
  const bottomItems = navGroups.flatMap((g) => g.items).slice(0, 5);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-border shadow-[0_-1px_8px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      {bottomItems.map(({ page, label, icon }) => (
        <NavLink
          key={page}
          to={`${ROUTES.DASHBOARD_ROOT}/${page}`}
          className={({ isActive }) =>
            `relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground active:text-primary'
            }`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <i
                className={`${icon} text-[1.15rem] transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                aria-hidden="true"
              />
              <span className={`text-[0.62rem] font-semibold leading-none ${isActive ? 'font-bold' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
