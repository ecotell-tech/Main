-- ─────────────────────────────────────────────────────────────
-- seed_permissions.sql
-- Run this via phpMyAdmin against the profit_portal database
-- if your DB was created before permission seed data existed.
-- Safe to re-run — uses INSERT IGNORE so it won't fail on dupes.
-- ─────────────────────────────────────────────────────────────

USE profit_portal;

-- ── 1. All permissions ────────────────────────────────────────
INSERT IGNORE INTO permissions (name, display_name, module) VALUES
  ('view_farmers',   'View Farmers',      'farmers'),
  ('create_farmer',  'Create Farmer',     'farmers'),
  ('edit_farmer',    'Edit Farmer',       'farmers'),
  ('delete_farmer',  'Delete Farmer',     'farmers'),
  ('view_visits',    'View Visits',       'visits'),
  ('create_visit',   'Create Visit',      'visits'),
  ('view_plans',     'View Plans',        'plans'),
  ('create_plan',    'Create Plan',       'plans'),
  ('approve_plan',   'Approve Plan',      'plans'),
  ('view_reports',   'View Reports',      'reports'),
  ('export_reports', 'Export Reports',    'reports'),
  ('view_settings',  'View Settings',     'settings'),
  ('edit_settings',  'Edit Settings',     'settings'),
  ('manage_users',   'Manage Users',      'admin'),
  ('manage_roles',   'Manage Roles',      'admin'),
  ('view_audit_log', 'View Audit Log',    'admin');

-- ── 2. Role → Permission grants ───────────────────────────────
-- Agronomist: register/edit farmers, visits, plans, reports, settings
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'agronomist'
  AND p.name IN (
    'view_farmers', 'create_farmer', 'edit_farmer',
    'view_visits',  'create_visit',
    'view_plans',   'create_plan',
    'view_reports',
    'view_settings', 'edit_settings'
  );

-- Team Lead: view/edit farmers, visits, approve plans, export reports, manage roles
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'team_lead'
  AND p.name IN (
    'view_farmers', 'create_farmer', 'edit_farmer',
    'view_visits',  'create_visit',
    'view_plans',   'create_plan', 'approve_plan',
    'view_reports', 'export_reports',
    'view_settings', 'manage_roles'
  );

-- Manager: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager';

-- Admin: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin';

-- Data Entry Operator: register farmers, create visits, view settings
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'data_entry_operator'
  AND p.name IN (
    'view_farmers', 'create_farmer',
    'view_visits',  'create_visit',
    'view_settings'
  );

-- ── 3. Verify ─────────────────────────────────────────────────
SELECT r.name AS role, COUNT(rp.permission_id) AS permissions_granted
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.id;
