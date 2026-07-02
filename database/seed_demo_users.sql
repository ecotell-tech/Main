-- ============================================================
-- Demo / dev user accounts for ProfitPortal
-- Run once:  docker exec profitportal_db mysql -u pscms -psecret profit_portal < database/seed_demo_users.sql
-- ============================================================

USE profit_portal;

-- All demo accounts use password: pscms@2024
INSERT IGNORE INTO users
  (employee_code, name, initials, mobile, password_hash, login_method, role_id, status, is_default_password)
VALUES
  -- Agronomist  (Farmer Representative)
  ('USR-0001', 'Ramesh Jadhav',   'RJ',
   '9579263798', '$2b$12$1ykeGeeJNBwFg7Ts/L7S..xlZqZlzFVA9ieaV8laQwlnNvcpnYKCq',
   'password',
   (SELECT id FROM roles WHERE name = 'agronomist'),
   'active', 0),

  -- Team Lead  (was Supervisor / Response Manager)
  ('USR-0002', 'Sunita Patil',    'SP',
   '9000000001', '$2b$12$/QMihEu4wOU0AlIrg4sGNuxxR9Ily5GaNjnwBoaIOp/xgrip3ACz6',
   'password',
   (SELECT id FROM roles WHERE name = 'team_lead'),
   'active', 0),

  -- Admin  (Manager — regional)
  ('USR-0003', 'Vikram Desai',    'VD',
   '9000000002', '$2b$12$MVougCT1M6tEc7q277f5FO.FwNx8vGk8T8SF.3pk3nkCaOUKl9pXW',
   'password',
   (SELECT id FROM roles WHERE name = 'admin'),
   'active', 0),

  -- Data Entry Operator
  ('USR-0004', 'Priya Kulkarni',  'PK',
   '9000000003', '$2b$12$9rWjol7XICuOprafLxatq.DKTwWIbo0zoopw8YFSIiVZCOH8kmgEG',
   'password',
   (SELECT id FROM roles WHERE name = 'data_entry_operator'),
   'active', 0),

  -- Manager  (Leadership — top level)
  ('USR-0005', 'Anil Sharma',     'AS',
   '9000000004', '$2b$12$sFzHr0r5BXAWMetVjyU.XOSmy/XVt2Z..JJZ5qoDR4PD.Bgkv0XRa',
   'password',
   (SELECT id FROM roles WHERE name = 'manager'),
   'active', 0);

-- ── Reset passwords for existing rows (safe to re-run) ───────────────────────
-- If users were already inserted with old/unknown hashes, update them now.
UPDATE users SET password_hash = '$2b$12$1ykeGeeJNBwFg7Ts/L7S..xlZqZlzFVA9ieaV8laQwlnNvcpnYKCq' WHERE mobile = '9579263798';
UPDATE users SET password_hash = '$2b$12$/QMihEu4wOU0AlIrg4sGNuxxR9Ily5GaNjnwBoaIOp/xgrip3ACz6' WHERE mobile = '9000000001';
UPDATE users SET password_hash = '$2b$12$MVougCT1M6tEc7q277f5FO.FwNx8vGk8T8SF.3pk3nkCaOUKl9pXW' WHERE mobile = '9000000002';
UPDATE users SET password_hash = '$2b$12$9rWjol7XICuOprafLxatq.DKTwWIbo0zoopw8YFSIiVZCOH8kmgEG' WHERE mobile = '9000000003';
UPDATE users SET password_hash = '$2b$12$sFzHr0r5BXAWMetVjyU.XOSmy/XVt2Z..JJZ5qoDR4PD.Bgkv0XRa' WHERE mobile = '9000000004';

-- ── Hierarchy wiring ───────────────────────────────────────────────────────────
-- Set reporting chain so form configs reach the right users:
--   Agronomist  (9579263798) → Team Lead (9000000001)
--   DEO         (9000000003) → Team Lead (9000000001)
--   Team Lead   (9000000001) → Admin/Manager (9000000002)
-- This sets users.manager_user_id which form_config_service uses to look up
-- which team lead's template an agronomist should receive.

UPDATE users
SET manager_user_id = (SELECT id FROM (SELECT id FROM users WHERE mobile = '9000000001') AS tl)
WHERE mobile IN ('9579263798', '9000000003');

UPDATE users
SET manager_user_id = (SELECT id FROM (SELECT id FROM users WHERE mobile = '9000000002') AS mgr)
WHERE mobile = '9000000001';

SELECT CONCAT('Seeded/updated ', ROW_COUNT(), ' demo user(s)') AS result;
