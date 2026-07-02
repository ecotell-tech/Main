import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { ToastProvider } from '@context/ToastContext';
import { PermissionsProvider } from '@context/PermissionsContext';
import { ModuleAccessProvider } from '@context/ModuleAccessContext';
import { FormConfigProvider }   from '@context/FormConfigContext';
import { ROUTES } from '@constants/routes';
import { ROUTE_REGISTRY } from '@constants/routeRegistry';
import AppLayout from '@layout/AppLayout/AppLayout';
import LoginPage from '@features/auth/LoginPage/LoginPage';
import ProtectedRoute from '@components/common/ProtectedRoute/ProtectedRoute';

/**
 * App — Root router.
 *
 * All protected screens are registered in `src/constants/routeRegistry.js`.
 * To add a screen: add one entry there — no changes needed here.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionsProvider>
          <ModuleAccessProvider>
          <FormConfigProvider>
          <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />

            {/* Protected shell — all registered routes rendered inside */}
            <Route
              path={ROUTES.DASHBOARD_ROOT}
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />

              {/* Auto-generated from ROUTE_REGISTRY — roles & permissions enforced per route */}
              {ROUTE_REGISTRY.map(({ path, component: Page, roles, permissions }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ProtectedRoute routePath={path} allowedRoles={roles} requiredPermissions={permissions}>
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                          <i className="fas fa-spinner fa-spin mr-2" /> Loading…
                        </div>
                      }>
                        <Page />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
              ))}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
          </Routes>
          </ToastProvider>
          </FormConfigProvider>
          </ModuleAccessProvider>
        </PermissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
