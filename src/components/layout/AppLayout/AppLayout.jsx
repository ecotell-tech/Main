import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@layout/Sidebar/Sidebar';
import AppHeader from '@layout/AppHeader/AppHeader';
import BottomNav from '@layout/BottomNav/BottomNav';
import ToastContainer from '@common/Toast/ToastContainer';
import { ROUTE_REGISTRY } from '@constants/routeRegistry';
import { useAuth } from '@context/AuthContext';

const ROLE_LABEL = {
  manager:             'Leadership',
  admin:               'Manager',
  team_lead:           'Team Lead',
  supervisor:          'Team Lead',
  agronomist:          'Field Representative',
  data_entry_operator: 'Data Entry Operator',
};

function resolvePageMeta(pathname) {
  const segment = pathname.replace(/^\/app\/?/, '');
  const entry = ROUTE_REGISTRY.find((r) => r.path === segment && r.nav);
  if (entry) return { title: entry.nav.label, subtitle: entry.nav.sub ?? '' };
  return { title: 'Dashboard', subtitle: '' };
}

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location   = useLocation();
  const navigate   = useNavigate();
  const { title, subtitle } = resolvePageMeta(location.pathname);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const { isImpersonating, currentUser, exitImpersonation } = useAuth();

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  function handleExitImpersonation() {
    exitImpersonation();
    navigate('/app/dashboard', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Offset main content past the fixed sidebar on lg+ */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{ marginLeft: 'var(--footer-left)' }}
      >
        <AppHeader
          pageTitle={title}
          pageSubtitle={subtitle}
          onMenuToggle={() => setIsSidebarOpen((p) => !p)}
        />

        {/* Impersonation notice bar */}
        {isImpersonating && (
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 text-white text-xs font-semibold shrink-0 shadow-md"
            style={{ background: 'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)', boxShadow: '0 2px 8px 0 rgba(239,68,68,0.45)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <i className="fas fa-circle-exclamation text-red-100 shrink-0 animate-pulse" />
              <span className="truncate">
                Viewing as <strong>{currentUser?.name}</strong>
                <span className="opacity-80 font-normal ml-1">({ROLE_LABEL[currentUser?.role] ?? currentUser?.role})</span>
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/35 transition-colors shrink-0 whitespace-nowrap border border-white/30"
            >
              <i className="fas fa-arrow-left text-[0.65rem]" />
              Return to Leadership
            </button>
          </div>
        )}

        <main
          className="flex-1 p-3 sm:p-4 lg:p-6"
          style={{ paddingBottom: 'var(--main-pb)' }}
        >
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  );
}
