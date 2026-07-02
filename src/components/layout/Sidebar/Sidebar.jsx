import { NavLink, useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '@constants/appConfig';
import { ROUTES } from '@constants/routes';
import { useAuth } from '@context/AuthContext';
import { usePermissions } from '@context/PermissionsContext';
import { useModuleAccess } from '@context/ModuleAccessContext';
import { getNavForRole } from '@constants/routeRegistry';
import { useRoleTheme } from '@hooks/useRoleTheme';
import Avatar from '@common/Avatar/Avatar';

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const { getRolePermissions } = usePermissions();
  const { canRoleAccess } = useModuleAccess();

  const theme = useRoleTheme();
  const role = currentUser?.role ?? '';
  const userPermissions = Array.from(getRolePermissions(role));
  const navItems = getNavForRole(role, userPermissions, canRoleAccess);

  function handleLogout() {
    signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: 'var(--sidebar-w)',
          background: `linear-gradient(180deg, ${theme.sidebarFrom} 0%, ${theme.sidebarTo} 100%)`,
        }}
        aria-label="Primary navigation"
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15">
            <img src={APP_CONFIG.brand.logoSrc} alt={`${APP_CONFIG.brand.name} logo`} width={22} height={22} />
          </div>
          <div>
            <div className="text-[0.85rem] font-bold font-heading leading-tight">{APP_CONFIG.brand.name}</div>
            <div className="text-[0.65rem] text-white/55 leading-tight">{APP_CONFIG.brand.tagline}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scroll" aria-label="App navigation">
          {navItems.map(({ section, items }) => (
            <div key={section}>
              <div className="px-3 mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-white/35">
                {section}
              </div>
              {items.map(({ page, label, icon, sub, badge }) => (
                <NavLink
                  key={page}
                  to={`${ROUTES.DASHBOARD_ROOT}/${page}`}
                  title={sub}
                  onClick={onClose}
                  aria-label={label}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[0.83rem] font-medium transition-colors mb-0.5 ${
                      isActive
                        ? "bg-white/20 text-white font-semibold before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-6 before:bg-white/90 before:rounded-r-full"
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <i className={`${icon} w-4 text-center text-sm shrink-0`} aria-hidden="true" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge != null && (
                    <span className="ml-auto min-w-[18px] text-center rounded-full bg-white/20 px-1.5 py-0.5 text-[0.6rem] font-bold" aria-label={`${badge} items`}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Avatar initials={currentUser?.initials ?? '??'} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-[0.82rem] font-semibold truncate">{currentUser?.name}</div>
              <div className="text-[0.65rem] text-white/60 truncate">{theme.label}</div>
            </div>
            <button
              className="flex items-center justify-center w-7 h-7 rounded-lg text-white/60 hover:text-white hover:bg-white/15 transition-colors"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <i className="fas fa-sign-out-alt text-xs" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
