/**
 * roles.js — Role definitions and permission gates for the entire platform.
 *
 * Hierarchy (top → bottom):
 *   Leadership (manager) → Manager (admin) → Team Lead (team_lead)
 *   → Data Entry Operator (data_entry_operator) & Farmer Representative (agronomist)
 *
 * EXTENDING FOR A NEW ROLE:
 *   1. Add the role string to `ROLES`.
 *   2. Add its permission set to `ROLE_PERMISSIONS`.
 *   3. Register its routes in routeRegistry.js.
 */

/** @enum {string} */
export const ROLES = Object.freeze({
  AGRONOMIST:            'agronomist',
  TEAM_LEAD:             'team_lead',
  ADMIN:                 'admin',
  DATA_ENTRY_OPERATOR:   'data_entry_operator',
  FARMER_SELF_SERVICE:   'farmer_self_service',
  MANAGER:               'manager',
  // Legacy alias — kept so any stored session tokens still parse correctly
  SUPERVISOR:            'team_lead',
});

/**
 * The one built-in, immutable super-admin role.
 * Cannot be deleted or have permissions restricted.
 */
export const LEADERSHIP_ROLE = ROLES.MANAGER;

/**
 * Default role templates used to seed the dynamic role store on first load.
 * Leadership is locked; all others are editable/deletable by Leadership.
 *
 * @type {Array<{id: string, name: string, icon: string, color: string, locked: boolean, superUser: boolean}>}
 */
export const DEFAULT_ROLE_TEMPLATES = Object.freeze([
  { id: ROLES.MANAGER,           name: 'Leadership',           icon: 'fas fa-crown',        color: '#0d9488', locked: true,  superUser: true  },
  { id: ROLES.ADMIN,             name: 'Manager',              icon: 'fas fa-user-shield',   color: '#7c3aed', locked: false, superUser: false },
  { id: ROLES.TEAM_LEAD,         name: 'Team Lead',            icon: 'fas fa-user-tie',      color: '#2563eb', locked: false, superUser: false },
  { id: ROLES.DATA_ENTRY_OPERATOR, name: 'Data Entry Operator', icon: 'fas fa-keyboard',    color: '#d97706', locked: false, superUser: false },
  { id: ROLES.AGRONOMIST,        name: 'Field Representative', icon: 'fas fa-leaf',          color: '#16a34a', locked: false, superUser: false },
]);

/**
 * All available permission keys.
 * @enum {string}
 */
export const PERMISSIONS = Object.freeze({
  // Farmers
  VIEW_FARMERS:       'view_farmers',
  CREATE_FARMER:      'create_farmer',
  EDIT_FARMER:        'edit_farmer',
  DELETE_FARMER:      'delete_farmer',

  // Visits
  VIEW_VISITS:        'view_visits',
  CREATE_VISIT:       'create_visit',

  // Plans
  VIEW_PLANS:         'view_plans',
  CREATE_PLAN:        'create_plan',
  APPROVE_PLAN:       'approve_plan',

  // Reports
  VIEW_REPORTS:       'view_reports',
  EXPORT_REPORTS:     'export_reports',

  // Settings
  VIEW_SETTINGS:      'view_settings',
  EDIT_SETTINGS:      'edit_settings',

  // Admin
  MANAGE_USERS:       'manage_users',
  MANAGE_ROLES:       'manage_roles',
  VIEW_AUDIT_LOG:     'view_audit_log',
});

/**
 * Permission sets per role.
 *
 * @type {Record<string, Set<string>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.AGRONOMIST]: new Set([
    PERMISSIONS.VIEW_FARMERS,
    PERMISSIONS.CREATE_FARMER,
    PERMISSIONS.EDIT_FARMER,
    PERMISSIONS.VIEW_VISITS,
    PERMISSIONS.CREATE_VISIT,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.CREATE_PLAN,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.EDIT_SETTINGS,
  ]),

  // Team Lead — configures forms for their team, approves plans, manages their reps
  [ROLES.TEAM_LEAD]: new Set([
    PERMISSIONS.VIEW_FARMERS,
    PERMISSIONS.CREATE_FARMER,
    PERMISSIONS.EDIT_FARMER,
    PERMISSIONS.VIEW_VISITS,
    PERMISSIONS.CREATE_VISIT,
    PERMISSIONS.VIEW_PLANS,
    PERMISSIONS.APPROVE_PLAN,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.EDIT_SETTINGS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
  ]),

  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),

  [ROLES.DATA_ENTRY_OPERATOR]: new Set([
    PERMISSIONS.VIEW_FARMERS,
    PERMISSIONS.CREATE_FARMER,
    PERMISSIONS.VIEW_VISITS,
    PERMISSIONS.CREATE_VISIT,
    PERMISSIONS.VIEW_SETTINGS,
  ]),

  // Leadership / Manager — Super Admin: all permissions, cannot be restricted
  [ROLES.MANAGER]: new Set(Object.values(PERMISSIONS)),
});

/**
 * Check if a role has a given permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a role has ALL of the given permissions.
 * @param {string} role
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAllPermissions(role, permissions) {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the given permissions.
 * @param {string} role
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function hasAnyPermission(role, permissions) {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Map from API role string → ROLES constant.
 * 'supervisor' is the legacy slug — normalized to 'team_lead' transparently.
 * @param {string} apiRole
 * @returns {string}
 */
export function normalizeRole(apiRole) {
  const map = {
    'Agronomist / Consultant': ROLES.AGRONOMIST,
    agronomist:                ROLES.AGRONOMIST,
    // Legacy slug kept in DB until migration runs; normalize to team_lead
    supervisor:                ROLES.TEAM_LEAD,
    team_lead:                 ROLES.TEAM_LEAD,
    admin:                     ROLES.ADMIN,
    data_entry:                ROLES.DATA_ENTRY_OPERATOR,
    data_entry_operator:       ROLES.DATA_ENTRY_OPERATOR,
    manager:                   ROLES.MANAGER,
  };
  return map[apiRole] ?? ROLES.AGRONOMIST;
}
