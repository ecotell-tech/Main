import { lazy, Suspense } from 'react';
import { useAuth } from '@context/AuthContext';
import { ROLES }   from '@constants/roles';

const AgronomistDashboard   = lazy(() => import('./AgronomistDashboard'));
const SupervisorDashboard   = lazy(() => import('@features/supervisor/SupervisorDashboardPage/SupervisorDashboardPage'));
const AdminDashboard        = lazy(() => import('@features/admin/AdminDashboardPage/AdminDashboardPage'));
const ManagerDashboard      = lazy(() => import('@features/manager/ManagerDashboardPage/ManagerDashboardPage'));
const DEODashboard          = lazy(() => import('@features/deo/DEODashboardPage/DEODashboardPage'));

const Loader = () => (
  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
    <i className="fas fa-spinner fa-spin mr-2" /> Loading…
  </div>
);

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  let Dashboard;
  if (role === ROLES.TEAM_LEAD) {
    Dashboard = SupervisorDashboard;
  } else if (role === ROLES.ADMIN) {
    Dashboard = AdminDashboard;
  } else if (role === ROLES.MANAGER) {
    Dashboard = ManagerDashboard;
  } else if (role === ROLES.DATA_ENTRY_OPERATOR) {
    Dashboard = DEODashboard;
  } else {
    Dashboard = AgronomistDashboard;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Dashboard />
    </Suspense>
  );
}
