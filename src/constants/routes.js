/**
 * Application route path constants.
 * All navigation must reference these — never hard-code path strings.
 */
export const ROUTES = Object.freeze({
  LOGIN: '/',

  DASHBOARD_ROOT: '/app',
  DASHBOARD:      'dashboard',
  FARMERS:        'farmers',
  FARMER_DETAIL:  'farmers/:farmerId',
  VISIT_LOG:      'visits',
  REGISTER_FARMER:'register',
  IMPORT_FARMER:  'import-farmers',
  REPORTS:              'reports',
  LEADERSHIP_REPORTS:   'leadership/performance',
  VIEW_AS:              'leadership/view-as',
  CONSULTING:           'admin/consulting',
  PERMISSION_MATRIX:    'admin/permissions',
  FORM_CONFIG:          'admin/form-config',
  TERRITORY_CONFIG:     'admin/territory-config',
  SETTINGS:             'settings',

  // Helper — full absolute path builders
  abs: {
    dashboard:          '/app/dashboard',
    farmers:            '/app/farmers',
    farmerDetail:       (id) => `/app/farmers/${id}`,
    visitLog:           '/app/visits',
    registerFarmer:     '/app/register',
    importFarmers:      '/app/import-farmers',
    reports:            '/app/reports',
    leadershipReports:  '/app/leadership/performance',
    viewAs:             '/app/leadership/view-as',
    consulting:         '/app/admin/consulting',
    permissionMatrix:   '/app/admin/permissions',
    formConfig:         '/app/admin/form-config',
    territoryConfig:    '/app/admin/territory-config',
    users:              '/app/admin/users',
    onboardUser:        '/app/leadership/onboard-user',
    settings:           '/app/settings',
  },
});
