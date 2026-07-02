/**
 * routeRegistry.js — Single source of truth for ALL application routes.
 *
 * ADDING A NEW SCREEN:
 *   1. Add a key to ROUTES (in routes.js).
 *   2. Add an entry here with `path`, `label`, `roles[]`, and `component`.
 *   3. App.jsx automatically picks it up — no manual <Route> additions needed.
 *
 * Each entry describes:
 *   - path        → relative path inside /app/ shell
 *   - component   → lazy-loaded page component
 *   - roles       → which roles can access it (empty array = all authenticated)
 *   - nav         → { label, icon, section, order } — drives sidebar & bottom nav
 *                    omit `nav` to hide from navigation (e.g. detail pages)
 */

import { lazy } from 'react';
import { ROLES, PERMISSIONS } from '@constants/roles';

// ── Lazy-load every page so only the active role's bundle is loaded ──
const DashboardPage       = lazy(() => import('@features/dashboard/DashboardPage/DashboardPage'));
const FarmersPage         = lazy(() => import('@features/farmers/FarmersPage/FarmersPage'));
const FarmerDetailPage    = lazy(() => import('@features/farmers/FarmerDetailPage/FarmerDetailPage'));
const VisitLogPage        = lazy(() => import('@features/visitLog/VisitLogPage/VisitLogPage'));
const RegisterFarmerPage  = lazy(() => import('@features/registerFarmer/RegisterFarmerPage/RegisterFarmerPage'));
const ReportsPage         = lazy(() => import('@features/reports/ReportsPage/ReportsPage'));
const SettingsPage        = lazy(() => import('@features/settings/SettingsPage/SettingsPage'));
const UsersPage               = lazy(() => import('@features/admin/UsersPage/UsersPage'));
const LeadershipReportsPage   = lazy(() => import('@features/manager/LeadershipReportsPage/LeadershipReportsPage'));
const TeamLeadReportsPage     = lazy(() => import('@features/supervisor/SupervisorReportsPage/SupervisorReportsPage'));
const ScoringConfigPage       = lazy(() => import('@features/admin/ScoringConfigPage/ScoringConfigPage'));
const TaskAssignmentPage      = lazy(() => import('@features/admin/TaskAssignmentPage/TaskAssignmentPage'));
const TerritoryAssignmentPage = lazy(() => import('@features/admin/TerritoryAssignmentPage/TerritoryAssignmentPage'));
const ActivityLogPage         = lazy(() => import('@features/manager/ActivityLogPage/ActivityLogPage'));
const CropMasterPage          = lazy(() => import('@features/manager/CropMasterPage/CropMasterPage'));
const ImpersonatePage         = lazy(() => import('@features/manager/ImpersonatePage/ImpersonatePage'));
const OnboardUserPage         = lazy(() => import('@features/manager/OnboardUserPage/OnboardUserPage'));
const DraftListPage           = lazy(() => import('@features/agronomist/DraftListPage/DraftListPage'));
const ImportFarmersPage       = lazy(() => import('@features/registerFarmer/ImportFarmersPage/ImportFarmersPage'));
const ConsultingPage          = lazy(() => import('@features/admin/ConsultingPage/ConsultingPage'));
const PermissionMatrixPage    = lazy(() => import('@features/admin/PermissionMatrixPage/PermissionMatrixPage'));
const FormConfigPage          = lazy(() => import('@features/admin/FormConfigPage/FormConfigPage'));
const TerritoryConfigPage     = lazy(() => import('@features/admin/TerritoryConfigPage/TerritoryConfigPage'));

/**
 * @typedef {Object} RouteNavConfig
 * @property {string}  label    - Display label in nav
 * @property {string}  icon     - Font Awesome class
 * @property {string}  section  - Sidebar section heading
 * @property {number}  order    - Sort order within section
 * @property {number}  [badge]  - Optional badge count
 */

/**
 * @typedef {Object} RouteEntry
 * @property {string}          path        - Relative path (no leading slash)
 * @property {React.LazyExoticComponent} component
 * @property {string[]}        roles       - Allowed roles; [] = all authenticated roles
 * @property {string[]}        permissions - Required permissions (all must match)
 * @property {RouteNavConfig}  [nav]       - If present, appears in sidebar & bottom nav
 */

/** @type {RouteEntry[]} */
export const ROUTE_REGISTRY = [
  {
    path:        'dashboard',
    component:   DashboardPage,
    roles:       [],
    permissions: [],
    nav: {
      label:   'Dashboard',
      icon:    'fas fa-home',
      section: 'Main Menu',
      order:   1,
    },
  },
  {
    path:        'farmers',
    component:   FarmersPage,
    roles:       [],
    permissions: [PERMISSIONS.VIEW_FARMERS],
    nav: {
      label:   'Farmers',
      icon:    'fas fa-users',
      section: 'Main Menu',
      order:   2,
    },
  },
  {
    path:        'farmers/:farmerId',
    component:   FarmerDetailPage,
    roles:       [],
    permissions: [PERMISSIONS.VIEW_FARMERS],
    // no nav — detail page, not in sidebar
  },
  {
    path:        'visits',
    component:   VisitLogPage,
    roles:       [ROLES.AGRONOMIST, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.DATA_ENTRY_OPERATOR],
    permissions: [PERMISSIONS.VIEW_VISITS],
    nav: {
      label:   'Visit Log',
      icon:    'fas fa-calendar-check',
      section: 'Main Menu',
      order:   3,
    },
  },
  {
    path:        'register',
    component:   RegisterFarmerPage,
    roles:       [ROLES.AGRONOMIST, ROLES.DATA_ENTRY_OPERATOR, ROLES.ADMIN, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.CREATE_FARMER],
    nav: {
      label:   'Register Farmer',
      icon:    'fas fa-user-plus',
      section: 'Main Menu',
      order:   4,
    },
  },
  {
    path:        'import-farmers',
    component:   ImportFarmersPage,
    roles:       [ROLES.AGRONOMIST, ROLES.DATA_ENTRY_OPERATOR, ROLES.ADMIN, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.CREATE_FARMER],
    nav: {
      label:   'Import Farmers',
      icon:    'fas fa-file-import',
      section: 'Main Menu',
      order:   5,
    },
  },
  {
    path:        'reports',
    component:   ReportsPage,
    roles:       [ROLES.AGRONOMIST, ROLES.TEAM_LEAD, ROLES.ADMIN, ROLES.MANAGER],
    permissions: [PERMISSIONS.VIEW_REPORTS],
    nav: {
      label:   'Reports',
      icon:    'fas fa-chart-bar',
      section: 'Reports',
      order:   1,
    },
  },
  {
    path:        'settings',
    component:   SettingsPage,
    roles:       [],
    permissions: [PERMISSIONS.VIEW_SETTINGS],
    nav: {
      label:   'Settings',
      icon:    'fas fa-cog',
      section: 'Settings',
      order:   1,
    },
  },
  {
    path:        'admin/users',
    component:   UsersPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.MANAGE_USERS],
    nav: {
      label:   'User Management',
      icon:    'fas fa-users-cog',
      section: 'Administration',
      order:   1,
    },
  },

  {
    path:        'leadership/performance',
    component:   LeadershipReportsPage,
    roles:       [ROLES.MANAGER],
    permissions: [PERMISSIONS.VIEW_REPORTS],
    nav: {
      label:   'Performance Report',
      icon:    'fas fa-chart-mixed',
      section: 'Reports',
      order:   2,
    },
  },

  {
    path:        'leadership/view-as',
    component:   ImpersonatePage,
    roles:       [ROLES.MANAGER],
    permissions: [],
    nav: {
      label:   'View As Team Member',
      icon:    'fas fa-binoculars',
      section: 'Leadership Tools',
      order:   1,
    },
  },

  // ── Team Lead screens ───────────────────────────────────────────
  {
    path:        'team-lead/reports',
    component:   TeamLeadReportsPage,
    roles:       [ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.VIEW_REPORTS],
    nav: {
      label:   'Analytics & Reports',
      icon:    'fas fa-chart-bar',
      section: 'Reports',
      order:   1,
    },
  },

  // ── Admin screens ────────────────────────────────────────────────
  {
    path:        'admin/scoring',
    component:   ScoringConfigPage,
    roles:       [ROLES.ADMIN],
    permissions: [PERMISSIONS.MANAGE_USERS],
    nav: {
      label:   'Scoring Config',
      icon:    'fas fa-sliders',
      section: 'Administration',
      order:   2,
    },
  },
  {
    path:        'admin/tasks',
    component:   TaskAssignmentPage,
    roles:       [ROLES.ADMIN],
    permissions: [PERMISSIONS.MANAGE_USERS],
    nav: {
      label:   'Task Assignment',
      icon:    'fas fa-user-tag',
      section: 'Administration',
      order:   3,
    },
  },
  {
    path:        'admin/territory',
    component:   TerritoryAssignmentPage,
    roles:       [ROLES.ADMIN],
    permissions: [PERMISSIONS.MANAGE_USERS],
    nav: {
      label:   'Territory Assignment',
      icon:    'fas fa-map-location-dot',
      section: 'Administration',
      order:   4,
    },
  },

  {
    path:        'admin/consulting',
    component:   ConsultingPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER],
    permissions: [PERMISSIONS.VIEW_FARMERS],
    nav: {
      label:   'Post-Conv. Consulting',
      icon:    'fas fa-handshake',
      section: 'Farming',
      order:   1,
    },
  },
  {
    path:        'admin/permissions',
    component:   PermissionMatrixPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER],
    permissions: [PERMISSIONS.MANAGE_ROLES],
    nav: {
      label:   'Permission Matrix',
      icon:    'fas fa-shield-halved',
      section: 'Administration',
      order:   5,
    },
  },
  {
    path:        'admin/form-config',
    component:   FormConfigPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.MANAGE_ROLES],
    nav: {
      label:   'Form Configuration',
      icon:    'fas fa-sliders',
      section: 'Administration',
      order:   6,
    },
  },
  {
    path:        'admin/territory-config',
    component:   TerritoryConfigPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.MANAGE_ROLES],
    nav: {
      label:   'Territory Configuration',
      icon:    'fas fa-map-location-dot',
      section: 'Administration',
      order:   7,
    },
  },

  // ── Manager (Leadership) screens ────────────────────────────────
  {
    path:        'leadership/onboard-user',
    component:   OnboardUserPage,
    roles:       [ROLES.ADMIN, ROLES.MANAGER],
    permissions: [PERMISSIONS.MANAGE_USERS],
    nav: {
      label:   'Onboard User',
      icon:    'fas fa-user-plus',
      section: 'Administration',
      order:   6,
    },
  },
  {
    path:        'leadership/activity',
    component:   ActivityLogPage,
    roles:       [ROLES.MANAGER],
    permissions: [PERMISSIONS.VIEW_REPORTS],
    nav: {
      label:   'Activity Log',
      icon:    'fas fa-list-check',
      section: 'Administration',
      order:   1,
    },
  },
  {
    path:        'leadership/crops',
    component:   CropMasterPage,
    roles:       [ROLES.MANAGER],
    permissions: [PERMISSIONS.VIEW_REPORTS],
    nav: {
      label:   'Crop Master',
      icon:    'fas fa-wheat-awn',
      section: 'Administration',
      order:   2,
    },
  },

  // ── Agronomist / DEO screens ─────────────────────────────────────
  {
    path:        'drafts',
    component:   DraftListPage,
    roles:       [ROLES.AGRONOMIST, ROLES.DATA_ENTRY_OPERATOR, ROLES.TEAM_LEAD],
    permissions: [PERMISSIONS.CREATE_FARMER],
    nav: {
      label:   'Saved Drafts',
      icon:    'fas fa-file-pen',
      section: 'Main Menu',
      order:   5,
    },
  },

  // ── Add future screens here ──────────────────────────────────────
];

/**
 * Filter the registry for a given role and return only accessible routes.
 *
 * @param {string}   role
 * @param {string[]} userPermissions
 * @param {((role: string, path: string, staticRoles: string[]) => boolean) | null} canAccess
 *   Optional callback from ModuleAccessContext. When provided it replaces the
 *   static `entry.roles` check so Leadership overrides take effect in the nav.
 *   Signature matches `canRoleAccess` from ModuleAccessContext.
 * @returns {RouteEntry[]}
 */
export function getRoutesForRole(role, userPermissions = [], canAccess = null) {
  // Leadership / Manager is the portal super-user:
  // they bypass every role restriction and always pass permission checks.
  const isSuperUser = role === ROLES.MANAGER;
  return ROUTE_REGISTRY.filter((entry) => {
    // Role check — prefer dynamic canAccess if supplied, else static roles[]
    let roleOk;
    if (isSuperUser) {
      roleOk = true;
    } else if (canAccess) {
      roleOk = canAccess(role, entry.path, entry.roles);
    } else {
      roleOk = entry.roles.length === 0 || entry.roles.includes(role);
    }
    // Permission check: all required permissions must be present
    const permOk = isSuperUser || entry.permissions.every((p) => userPermissions.includes(p));
    return roleOk && permOk;
  });
}

/**
 * Build NAV_ITEMS shape (grouped sections) from the registry for a given role.
 * Used by Sidebar and BottomNav.
 *
 * @param {string}   role
 * @param {string[]} userPermissions
 * @param {((role: string, path: string, staticRoles: string[]) => boolean) | null} canAccess
 * @returns {Array<{ section: string, items: object[] }>}
 */
export function getNavForRole(role, userPermissions = [], canAccess = null) {
  const routes = getRoutesForRole(role, userPermissions, canAccess).filter((r) => r.nav);

  const sections = {};
  for (const route of routes) {
    const { section, order, label, icon, badge } = route.nav;
    if (!sections[section]) sections[section] = [];
    sections[section].push({ page: route.path, label, icon, order, badge });
  }

  return Object.entries(sections).map(([section, items]) => ({
    section,
    items: items.sort((a, b) => a.order - b.order),
  }));
}
