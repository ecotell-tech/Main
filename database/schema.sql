-- ============================================================
-- ProfitPortal PSCMS — Database Schema
-- Version   : 1.0.0
-- Created   : 2026-05-24
-- Engine    : MySQL 8.0+ / MariaDB 10.6+
-- Charset   : utf8mb4 / utf8mb4_unicode_ci
--
-- Naming conventions
--   • Tables        : snake_case, plural nouns
--   • Primary keys  : id  (AUTO_INCREMENT)
--   • Foreign keys  : {referenced_table_singular}_id
--   • Pivot tables  : {table_a_singular}_{table_b_plural}  (alphabetical)
--   • Timestamps    : created_at / updated_at / deleted_at (soft-delete)
--   • Booleans      : is_{name}  TINYINT(1)
--   • Status cols   : ENUM with explicit allowed values
--   • Constraints   : fk_{table}_{column}, uq_{table}_{column(s)},
--                     idx_{table}_{column(s)}
--
-- Table index (45 tables)
--   ── Auth / Access Control ──────────────────────────────────
--   01. roles
--   02. permissions
--   03. role_permissions              (pivot)
--   04. users                         (extended: OnboardUserPage 9-step wizard)
--   05. otp_sessions
--   ── Geography ──────────────────────────────────────────────
--   06. states
--   07. districts
--   08. talukas
--   09. villages
--   10. territories
--   11. user_territory_assignments    (pivot)
--   ── Farmer Profile ─────────────────────────────────────────
--   12. crops
--   13. challenges
--   14. govt_schemes
--   15. inputs
--   16. irrigation_infrastructure_types
--   17. farmers                       (extended: RegisterFarmerPage 9-step wizard)
--   18. farmer_crops                  (pivot)
--   19. farmer_user_assignments       (pivot — with due_date from TaskAssignmentPage)
--   20. farmer_challenges             (pivot)
--   21. farmer_govt_schemes           (pivot)
--   22. farmer_inputs                 (pivot)
--   23. farmer_irrigation_infrastructure (pivot)
--   ── Consulting Plans ───────────────────────────────────────
--   24. plan_component_types
--   25. consulting_plans              (with consultant_user_id + overall_status)
--   26. plan_component_statuses
--   ── Visits & Media ─────────────────────────────────────────
--   27. visit_types
--   28. visits
--   29. farm_photos
--   ── Scoring ────────────────────────────────────────────────
--   30. scoring_factors               (replaces flat scoring_configs)
--   30a.scoring_factor_options
--   ── System / Config ────────────────────────────────────────
--   31. notification_preferences
--   32. draft_registrations
--   33. activity_logs
--   ── Extended (OnboardUserPage / ImportFarmersPage / etc.) ──
--   34. languages
--   35. user_languages                (pivot)
--   36. user_emergency_contacts
--   37. user_documents
--   38. user_devices
--   39. farmer_awareness_programs
--   40. farmer_awareness              (pivot)
--   41. impersonate_sessions
--   42. bulk_import_logs
--   43. system_backups
--   44. deo_capture_targets
--   45. report_exports
-- ============================================================

CREATE DATABASE IF NOT EXISTS profit_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE profit_portal;

-- ─────────────────────────────────────────────────────────────
-- 01. ROLES
--     Defines every platform role (agronomist, supervisor, …).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id           TINYINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name         VARCHAR(60)       NOT NULL  COMMENT 'Machine-readable slug, e.g. agronomist',
  display_name VARCHAR(100)      NOT NULL,
  description  TEXT                  NULL,
  is_active    TINYINT(1)        NOT NULL  DEFAULT 1,
  created_at   TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB
  COMMENT='Platform role definitions';


-- ─────────────────────────────────────────────────────────────
-- 02. PERMISSIONS
--     Atomic capability flags (view_farmers, create_plan, …).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE permissions (
  id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(80)       NOT NULL  COMMENT 'Unique slug, e.g. view_farmers',
  display_name VARCHAR(120)      NOT NULL,
  module       VARCHAR(60)       NOT NULL  COMMENT 'Logical grouping: farmers | visits | plans | reports | settings | admin',
  description  TEXT                  NULL,
  created_at   TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name   (name),
  KEY        idx_permissions_module (module)
) ENGINE=InnoDB
  COMMENT='Atomic permission keys';


-- ─────────────────────────────────────────────────────────────
-- 03. ROLE_PERMISSIONS  (pivot — roles ↔ permissions)
--     modified_by_user_id + modified_at track who last changed
--     the matrix via PermissionMatrixPage "Save Changes".
-- ─────────────────────────────────────────────────────────────
CREATE TABLE role_permissions (
  role_id              TINYINT UNSIGNED  NOT NULL,
  permission_id        SMALLINT UNSIGNED NOT NULL,
  modified_by_user_id  BIGINT UNSIGNED       NULL  COMMENT 'Last admin who toggled this grant',
  modified_at          TIMESTAMP             NULL  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_permission_id   (permission_id),
  KEY idx_rp_modified_by     (modified_by_user_id),

  CONSTRAINT fk_rp_role
    FOREIGN KEY (role_id)             REFERENCES roles(id)       ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission
    FOREIGN KEY (permission_id)       REFERENCES permissions(id) ON DELETE CASCADE
  -- fk_rp_modified_by added after users table via ALTER TABLE below
) ENGINE=InnoDB
  COMMENT='Many-to-many: roles ↔ permissions (with last-modified audit)';


-- ─────────────────────────────────────────────────────────────
-- 04. USERS
--     All platform users regardless of role.
--     Self-referential reporting_to_user_id models the hierarchy.
--     Extended fields sourced from OnboardUserPage 9-step wizard.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  -- ── Identity ────────────────────────────────────────────────
  id                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  employee_code        VARCHAR(20)      NOT NULL  COMMENT 'Human-readable ID, e.g. USR-001',
  name                 VARCHAR(120)     NOT NULL,
  initials             VARCHAR(5)           NULL,
  dob                  DATE                 NULL,
  gender               ENUM('male','female','other') NULL,
  blood_group          VARCHAR(5)           NULL  COMMENT 'A+, B-, O+, AB+, etc.',
  aadhaar_masked       VARCHAR(20)          NULL  COMMENT 'Last 4 digits only — XXXX-XXXX-NNNN',
  pan_masked           VARCHAR(10)          NULL  COMMENT 'Masked PAN for display only',

  -- ── Contact ─────────────────────────────────────────────────
  mobile               VARCHAR(15)      NOT NULL,
  alt_mobile           VARCHAR(15)          NULL,
  whatsapp_mobile      VARCHAR(15)          NULL,
  email                VARCHAR(180)         NULL,
  personal_email       VARCHAR(180)         NULL,

  -- ── Auth ────────────────────────────────────────────────────
  password_hash        VARCHAR(255)         NULL  COMMENT 'bcrypt hash; NULL = OTP-only account',
  is_default_password  TINYINT(1)       NOT NULL  DEFAULT 1  COMMENT '1 = user has not changed default password yet',
  login_method         ENUM('otp','password','both') NOT NULL DEFAULT 'otp',
  is_two_fa_enabled    TINYINT(1)       NOT NULL  DEFAULT 0,
  access_from          DATE                 NULL  COMMENT 'Account active-from date',
  access_to            DATE                 NULL  COMMENT 'Account active-until date (NULL = no expiry)',

  -- ── Role & Reporting ────────────────────────────────────────
  role_id              TINYINT UNSIGNED NOT NULL,
  reporting_to_user_id BIGINT UNSIGNED      NULL  COMMENT 'Self-referential org hierarchy',
  designation          VARCHAR(120)         NULL,
  department           VARCHAR(100)         NULL,
  employment_type      ENUM('permanent','contract','probation','intern') NULL,
  status               ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',

  -- ── Dates & Experience ──────────────────────────────────────
  joined_date          DATE                 NULL,
  probation_end_date   DATE                 NULL,
  experience_years     DECIMAL(4,1)         NULL,
  education_qualification VARCHAR(120)      NULL,
  previous_org         VARCHAR(150)         NULL,
  previous_exp_years   DECIMAL(4,1)         NULL,

  -- ── Territory ───────────────────────────────────────────────
  pin_code             VARCHAR(10)          NULL,
  target_farmers       SMALLINT UNSIGNED    NULL  COMMENT 'Farmer count target assigned to this user',

  -- ── Bank / Payroll ──────────────────────────────────────────
  bank_name            VARCHAR(120)         NULL,
  bank_account_masked  VARCHAR(25)          NULL  COMMENT 'Masked — last 4 digits only',
  ifsc_code            VARCHAR(15)          NULL,
  pf_number            VARCHAR(30)          NULL,
  uan_number           VARCHAR(20)          NULL,
  ctc                  DECIMAL(12,2)        NULL  COMMENT 'Annual CTC in INR',

  -- ── Security / Lockout ────────────────────────────────────────
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0  COMMENT 'Resets to 0 on successful login',
  locked_until          TIMESTAMP            NULL             COMMENT '15-minute lockout after 5 failed attempts',

  -- ── UI / Misc ───────────────────────────────────────────────
  avatar_gradient      VARCHAR(120)         NULL,
  last_login_at        TIMESTAMP            NULL,
  created_at           TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           TIMESTAMP            NULL  COMMENT 'Soft delete — NULL means not deleted',

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_employee_code     (employee_code),
  UNIQUE KEY uq_users_email             (email),
  UNIQUE KEY uq_users_mobile            (mobile),
  KEY        idx_users_role_id          (role_id),
  KEY        idx_users_reporting_to     (reporting_to_user_id),
  KEY        idx_users_status           (status),
  KEY        idx_users_deleted_at       (deleted_at),

  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)              REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_users_reporting_to
    FOREIGN KEY (reporting_to_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='All platform users across every role';

-- Add FK deferred from role_permissions (users table now exists)
ALTER TABLE role_permissions
  ADD CONSTRAINT fk_rp_modified_by
    FOREIGN KEY (modified_by_user_id) REFERENCES users(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────────────
-- 05. OTP_SESSIONS
--     One-time password records for mobile-based login.
--     OTP is always stored hashed — never in plain text.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE otp_sessions (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  mobile      VARCHAR(15)      NOT NULL,
  otp_hash    VARCHAR(255)     NOT NULL  COMMENT 'bcrypt/argon2 hash of the OTP; NEVER store plaintext',
  expires_at  TIMESTAMP        NOT NULL,
  verified_at TIMESTAMP            NULL,
  attempts    TINYINT UNSIGNED NOT NULL  DEFAULT 0,
  ip_address  VARCHAR(45)          NULL  COMMENT 'IPv4 or IPv6',
  created_at  TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_otp_mobile     (mobile),
  KEY idx_otp_expires_at (expires_at)
) ENGINE=InnoDB
  COMMENT='OTP login sessions — expire automatically, never reused';


-- ─────────────────────────────────────────────────────────────
-- 06. STATES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE states (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)       NOT NULL,
  code       CHAR(3)               NULL  COMMENT 'ISO 3166-2 subdivision code, e.g. GJ, MH',
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_states_name (name),
  UNIQUE KEY uq_states_code (code)
) ENGINE=InnoDB
  COMMENT='Indian states master list';


-- ─────────────────────────────────────────────────────────────
-- 07. DISTRICTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE districts (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  state_id   SMALLINT UNSIGNED NOT NULL,
  name       VARCHAR(100)      NOT NULL,
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_districts_state_name (state_id, name),
  KEY        idx_districts_state_id  (state_id),

  CONSTRAINT fk_districts_state
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Districts within states';


-- ─────────────────────────────────────────────────────────────
-- 08. TALUKAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE talukas (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  district_id SMALLINT UNSIGNED NOT NULL,
  name        VARCHAR(100)      NOT NULL,
  created_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_talukas_district_name (district_id, name),
  KEY        idx_talukas_district_id  (district_id),

  CONSTRAINT fk_talukas_district
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Talukas / sub-districts within districts';


-- ─────────────────────────────────────────────────────────────
-- 09. VILLAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE villages (
  id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  taluka_id  SMALLINT UNSIGNED NOT NULL,
  name       VARCHAR(100)      NOT NULL,
  pin_code   VARCHAR(10)           NULL  COMMENT 'Postal PIN code for this village',
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_villages_taluka_id (taluka_id),
  KEY idx_villages_pin_code  (pin_code),

  CONSTRAINT fk_villages_taluka
    FOREIGN KEY (taluka_id) REFERENCES talukas(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Villages within talukas — pin_code is the canonical postal code';


-- ─────────────────────────────────────────────────────────────
-- 10. TERRITORIES
--     Named operational zones used for user assignment
--     (e.g. "Nashik Taluka", "Yeola Cluster").
--     A territory may span one district or be broader.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE territories (
  id          INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)      NOT NULL,
  state_id    SMALLINT UNSIGNED     NULL,
  district_id SMALLINT UNSIGNED     NULL,
  description TEXT                  NULL,
  created_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_territories_state_id    (state_id),
  KEY idx_territories_district_id (district_id),

  CONSTRAINT fk_territories_state
    FOREIGN KEY (state_id)    REFERENCES states(id)    ON DELETE SET NULL,
  CONSTRAINT fk_territories_district
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Named field / sales territories';


-- ─────────────────────────────────────────────────────────────
-- 11. USER_TERRITORY_ASSIGNMENTS  (pivot — users ↔ territories)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_territory_assignments (
  id                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED  NOT NULL,
  territory_id        INT UNSIGNED     NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED      NULL,
  assigned_at         TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  is_active           TINYINT(1)       NOT NULL  DEFAULT 1,
  created_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_uta_user_territory    (user_id, territory_id),
  KEY        idx_uta_territory_id     (territory_id),
  KEY        idx_uta_assigned_by      (assigned_by_user_id),

  CONSTRAINT fk_uta_user
    FOREIGN KEY (user_id)             REFERENCES users(id)       ON DELETE CASCADE,
  CONSTRAINT fk_uta_territory
    FOREIGN KEY (territory_id)        REFERENCES territories(id) ON DELETE CASCADE,
  CONSTRAINT fk_uta_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Many-to-many: users ↔ territories they cover';


-- ─────────────────────────────────────────────────────────────
-- 12. CROPS  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE crops (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)       NOT NULL,
  category   VARCHAR(60)           NULL  COMMENT 'Cash Crop | Cereal | Vegetable | Oilseed | Spice | Fibre',
  season     VARCHAR(60)           NULL  COMMENT 'Kharif | Rabi | Zaid | Perennial',
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_crops_name (name)
) ENGINE=InnoDB
  COMMENT='Crop master data';


-- ─────────────────────────────────────────────────────────────
-- 13. CHALLENGES  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE challenges (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)      NOT NULL,
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_challenges_name (name)
) ENGINE=InnoDB
  COMMENT='Farming challenge / problem categories';


-- ─────────────────────────────────────────────────────────────
-- 14. GOVT_SCHEMES  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE govt_schemes (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)      NOT NULL,
  description TEXT                  NULL,
  created_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_govt_schemes_name (name)
) ENGINE=InnoDB
  COMMENT='Government agricultural scheme master list';


-- ─────────────────────────────────────────────────────────────
-- 15. INPUTS  (master — fertilisers, pesticides, bio-inputs …)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE inputs (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)      NOT NULL,
  type       ENUM(
               'chemical_fertilizer',
               'pesticide',
               'bio_fertilizer',
               'compost',
               'jeevamrut',
               'neem_product',
               'other'
             )                 NOT NULL  DEFAULT 'other',
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_inputs_name (name)
) ENGINE=InnoDB
  COMMENT='Agricultural input products master';


-- ─────────────────────────────────────────────────────────────
-- 16. IRRIGATION_INFRASTRUCTURE_TYPES  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE irrigation_infrastructure_types (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)      NOT NULL,
  created_at TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_iit_name (name)
) ENGINE=InnoDB
  COMMENT='Types of irrigation infrastructure (Drip System, Sprinkler, …)';


-- ─────────────────────────────────────────────────────────────
-- 17. FARMERS
--     Core entity — one row per registered farmer.
--     Fields map directly to the 9-step RegisterFarmerPage wizard.
--     Aadhaar / bank stored as masked strings only (no plaintext).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmers (
  -- ── Identity (Step 1) ───────────────────────────────────────
  id                    BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  farmer_code           VARCHAR(20)      NOT NULL  COMMENT 'Human-readable ID, e.g. FMR-001 or PKM-xxx',
  first_name            VARCHAR(60)      NOT NULL,
  middle_name           VARCHAR(60)          NULL,
  last_name             VARCHAR(60)          NULL,
  name                  VARCHAR(120)     NOT NULL  COMMENT 'Computed full name for display / search',
  initials              VARCHAR(5)           NULL,
  mobile                VARCHAR(15)      NOT NULL,
  alt_mobile            VARCHAR(15)          NULL,
  gender                ENUM('male','female','other') NULL,
  dob                   DATE                 NULL,
  age                   TINYINT UNSIGNED     NULL  COMMENT 'Denormalised for quick querying; derived from dob',
  education_level       ENUM('None','Primary','Secondary','Graduate','Post Graduate') NOT NULL DEFAULT 'None',
  aadhaar_masked        VARCHAR(20)          NULL  COMMENT 'XXXX-XXXX-NNNN — last 4 digits only',
  bank_account_masked   VARCHAR(25)          NULL  COMMENT 'Last 4 digits only',

  -- ── Location (Step 2) ───────────────────────────────────────
  village_id            INT UNSIGNED         NULL,
  pin_code              VARCHAR(10)          NULL,
  nearest_mandi         VARCHAR(120)         NULL  COMMENT 'Nearest agricultural market / mandi',
  gps_lat               DECIMAL(10,6)        NULL  COMMENT 'WGS-84 latitude',
  gps_lng               DECIMAL(10,6)        NULL  COMMENT 'WGS-84 longitude',

  -- ── Farm Details (Step 3) ────────────────────────────────────
  land_acres            DECIMAL(8,2)         NULL  COMMENT 'Total land in acres',
  irrigated_land_acres  DECIMAL(8,2)         NULL,
  non_irrigated_land_acres DECIMAL(8,2)      NULL,
  soil_type             VARCHAR(80)          NULL,
  water_source          VARCHAR(80)          NULL,
  land_ownership        ENUM('owned','leased','share_cropped','other') NULL,

  -- ── Crop Info (Step 4) ───────────────────────────────────────
  annual_yield_quintals DECIMAL(10,2)        NULL,
  crop_coverage_acres   DECIMAL(8,2)         NULL,
  yield_history_notes   TEXT                 NULL,

  -- ── Practice & Inputs (Step 5) ──────────────────────────────
  farming_type          ENUM('chemical','organic','natural','mixed') NOT NULL DEFAULT 'chemical',
  practice_notes        TEXT                 NULL,

  -- ── Readiness (Step 6) ───────────────────────────────────────
  interest_level        ENUM('high','medium','low')              NULL,
  training_willingness  ENUM('very_willing','moderate','not_willing') NULL,
  adoption_timeline     VARCHAR(80)          NULL  COMMENT 'e.g. Immediate, 3–6 months, Next season',
  attended_training     TINYINT(1)       NOT NULL  DEFAULT 0,

  -- ── Engagement (Step 7) ──────────────────────────────────────
  consult_notes         TEXT                 NULL,
  followup_date         DATE                 NULL,
  appointment_date      DATE                 NULL,
  priority              ENUM('high','medium','low')              NULL,
  next_action           VARCHAR(255)         NULL,
  referred_by           VARCHAR(120)         NULL,

  -- ── Scoring & Status ─────────────────────────────────────────
  adoption_score        TINYINT UNSIGNED     NULL  COMMENT '0–100 computed adoption score',
  plan_status           ENUM('pending','active','completed','inactive') NOT NULL DEFAULT 'pending',
  last_visit_date       DATE                 NULL  COMMENT 'Denormalized — synced from visits for fast list display',
  next_visit_date       DATE                 NULL  COMMENT 'Denormalized — set when a visit is scheduled',

  -- ── Meta / Workflow ──────────────────────────────────────────
  family_members        TINYINT UNSIGNED     NULL,
  annual_income         DECIMAL(12,2)        NULL,
  registered_by_user_id BIGINT UNSIGNED      NULL,
  submitted_by_role     VARCHAR(60)          NULL  COMMENT 'Role slug at the time of registration',
  survey_date           DATE                 NULL,
  approved_by_user_id   BIGINT UNSIGNED      NULL,
  approved_date         DATE                 NULL,
  submission_notes      TEXT                 NULL,
  avatar_gradient       VARCHAR(120)         NULL,
  is_draft              TINYINT(1)       NOT NULL  DEFAULT 0  COMMENT '1 during step-by-step wizard; set to 0 on final submit',
  created_at            TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            TIMESTAMP            NULL  COMMENT 'Soft delete',

  PRIMARY KEY (id),
  UNIQUE KEY uq_farmers_farmer_code       (farmer_code),
  UNIQUE KEY uq_farmers_mobile            (mobile),
  KEY        idx_farmers_village_id       (village_id),
  KEY        idx_farmers_registered_by    (registered_by_user_id),
  KEY        idx_farmers_approved_by      (approved_by_user_id),
  KEY        idx_farmers_plan_status      (plan_status),
  KEY        idx_farmers_adoption_score   (adoption_score),
  KEY        idx_farmers_deleted_at       (deleted_at),

  CONSTRAINT fk_farmers_village
    FOREIGN KEY (village_id)            REFERENCES villages(id) ON DELETE SET NULL,
  CONSTRAINT fk_farmers_registered_by
    FOREIGN KEY (registered_by_user_id) REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT fk_farmers_approved_by
    FOREIGN KEY (approved_by_user_id)   REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Farmer profiles — primary entity of the platform';


-- ─────────────────────────────────────────────────────────────
-- 18. FARMER_CROPS  (pivot — farmers ↔ crops)
--     A farmer may grow multiple crops; one is flagged primary.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_crops (
  id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  farmer_id  BIGINT UNSIGNED   NOT NULL,
  crop_id    SMALLINT UNSIGNED NOT NULL,
  is_primary TINYINT(1)        NOT NULL  DEFAULT 0  COMMENT '1 = primary / main crop',
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_farmer_crops          (farmer_id, crop_id),
  KEY        idx_farmer_crops_crop_id (crop_id),

  CONSTRAINT fk_fc_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
  CONSTRAINT fk_fc_crop
    FOREIGN KEY (crop_id)   REFERENCES crops(id)   ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ crops grown';


-- ─────────────────────────────────────────────────────────────
-- 19. FARMER_PHOTOS  (one row per uploaded photo slot)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmer_photos (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farmer_id  BIGINT UNSIGNED NOT NULL,
  photo_type VARCHAR(50)     NOT NULL  COMMENT 'farmer | land | well | soil | house',
  file_path  VARCHAR(500)    NOT NULL  COMMENT 'Relative path under uploads/',
  caption    VARCHAR(255)        NULL,
  created_at TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_farmer_photos_farmer_id (farmer_id),

  CONSTRAINT fk_fp_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Up to 5 farm photos per farmer (one per slot type)';


-- ─────────────────────────────────────────────────────────────
-- 20. FARMER_USER_ASSIGNMENTS  (pivot — farmers ↔ users)
--     Tracks which agronomist / DEO is responsible for a farmer.
--     due_date is set by admin via TaskAssignmentPage.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_user_assignments (
  id                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  farmer_id           BIGINT UNSIGNED  NOT NULL,
  user_id             BIGINT UNSIGNED  NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED      NULL,
  assigned_at         TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  due_date            DATE                 NULL  COMMENT 'Target completion date set during task assignment',
  is_active           TINYINT(1)       NOT NULL  DEFAULT 1,
  created_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_fua_farmer_user     (farmer_id, user_id),
  KEY        idx_fua_user_id        (user_id),
  KEY        idx_fua_assigned_by    (assigned_by_user_id),

  CONSTRAINT fk_fua_farmer
    FOREIGN KEY (farmer_id)           REFERENCES farmers(id) ON DELETE CASCADE,
  CONSTRAINT fk_fua_user
    FOREIGN KEY (user_id)             REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_fua_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ users assigned to manage them';


-- ─────────────────────────────────────────────────────────────
-- 20. FARMER_CHALLENGES  (pivot — farmers ↔ challenges)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_challenges (
  farmer_id    BIGINT UNSIGNED   NOT NULL,
  challenge_id SMALLINT UNSIGNED NOT NULL,
  noted_at     DATE                  NULL,

  PRIMARY KEY (farmer_id, challenge_id),
  KEY idx_fch_challenge_id (challenge_id),

  CONSTRAINT fk_fch_farmer
    FOREIGN KEY (farmer_id)    REFERENCES farmers(id)    ON DELETE CASCADE,
  CONSTRAINT fk_fch_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ challenges they face';


-- ─────────────────────────────────────────────────────────────
-- 21. FARMER_GOVT_SCHEMES  (pivot — farmers ↔ govt_schemes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_govt_schemes (
  farmer_id       BIGINT UNSIGNED   NOT NULL,
  scheme_id       SMALLINT UNSIGNED NOT NULL,
  enrollment_date DATE                  NULL,
  created_at      TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (farmer_id, scheme_id),
  KEY idx_fgs_scheme_id (scheme_id),

  CONSTRAINT fk_fgs_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers(id)      ON DELETE CASCADE,
  CONSTRAINT fk_fgs_scheme
    FOREIGN KEY (scheme_id) REFERENCES govt_schemes(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ government schemes enrolled in';


-- ─────────────────────────────────────────────────────────────
-- 22. FARMER_INPUTS  (pivot — farmers ↔ inputs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_inputs (
  farmer_id  BIGINT UNSIGNED   NOT NULL,
  input_id   SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (farmer_id, input_id),
  KEY idx_fi_input_id (input_id),

  CONSTRAINT fk_fi_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
  CONSTRAINT fk_fi_input
    FOREIGN KEY (input_id)  REFERENCES inputs(id)  ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ agricultural inputs currently used';


-- ─────────────────────────────────────────────────────────────
-- 23. FARMER_IRRIGATION_INFRASTRUCTURE
--     (pivot — farmers ↔ irrigation_infrastructure_types)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_irrigation_infrastructure (
  farmer_id     BIGINT UNSIGNED  NOT NULL,
  infra_type_id TINYINT UNSIGNED NOT NULL,
  is_owned      TINYINT(1)       NOT NULL  DEFAULT 1  COMMENT '1 = owned, 0 = rented / shared',
  created_at    TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (farmer_id, infra_type_id),
  KEY idx_fii_infra_type_id (infra_type_id),

  CONSTRAINT fk_fii_farmer
    FOREIGN KEY (farmer_id)     REFERENCES farmers(id)                        ON DELETE CASCADE,
  CONSTRAINT fk_fii_infra_type
    FOREIGN KEY (infra_type_id) REFERENCES irrigation_infrastructure_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ irrigation infrastructure owned or used';


-- ─────────────────────────────────────────────────────────────
-- 24. PLAN_COMPONENT_TYPES  (master)
--     The fixed set of activities inside a consulting plan:
--     irrigation, fertilizer, spray, crop_advisory.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE plan_component_types (
  id            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(40)      NOT NULL  COMMENT 'Slug: irrigation | fertilizer | spray | crop_advisory',
  label         VARCHAR(100)     NOT NULL,
  icon_class    VARCHAR(80)          NULL,
  display_order TINYINT UNSIGNED NOT NULL  DEFAULT 0,
  is_active     TINYINT(1)       NOT NULL  DEFAULT 1,
  created_at    TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_pct_code (code)
) ENGINE=InnoDB
  COMMENT='Master list of consulting plan component types';


-- ─────────────────────────────────────────────────────────────
-- 25. CONSULTING_PLANS
--     One plan per farmer engagement.  Components are tracked
--     individually in plan_component_statuses.
--     consultant_user_id is managed via ConsultingPage.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE consulting_plans (
  id                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  plan_code            VARCHAR(20)      NOT NULL  COMMENT 'Human-readable ID, e.g. PLN-2026-00001',
  farmer_id            BIGINT UNSIGNED  NOT NULL,
  consultant_user_id   BIGINT UNSIGNED      NULL  COMMENT 'Assigned consultant (may differ from creator)',
  created_by_user_id   BIGINT UNSIGNED      NULL,
  approved_by_user_id  BIGINT UNSIGNED      NULL,
  status               ENUM('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
  overall_status       ENUM('not_started','plan_created','in_progress','completed') NOT NULL DEFAULT 'not_started'
                         COMMENT 'High-level checkpoint used in ConsultingPage',
  notes                TEXT                 NULL,
  start_date           DATE                 NULL,
  end_date             DATE                 NULL,
  created_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP            NULL  COMMENT 'Soft delete',

  PRIMARY KEY (id),
  UNIQUE KEY uq_cp_plan_code          (plan_code),
  KEY        idx_cp_farmer_id         (farmer_id),
  KEY        idx_cp_consultant        (consultant_user_id),
  KEY        idx_cp_created_by        (created_by_user_id),
  KEY        idx_cp_approved_by       (approved_by_user_id),
  KEY        idx_cp_status            (status),
  KEY        idx_cp_deleted_at        (deleted_at),

  CONSTRAINT fk_cp_farmer
    FOREIGN KEY (farmer_id)           REFERENCES farmers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cp_consultant
    FOREIGN KEY (consultant_user_id)  REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_cp_created_by
    FOREIGN KEY (created_by_user_id)  REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_cp_approved_by
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Consulting plans issued to farmers';


-- ─────────────────────────────────────────────────────────────
-- 26. PLAN_COMPONENT_STATUSES
--     Per-component progress within a consulting plan.
--     One row per (plan, component_type) pair.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE plan_component_statuses (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  plan_id           BIGINT UNSIGNED  NOT NULL,
  component_type_id TINYINT UNSIGNED NOT NULL,
  status            ENUM('pending','active','done','skipped') NOT NULL DEFAULT 'pending',
  completed_at      TIMESTAMP            NULL,
  notes             TEXT                 NULL,
  created_at        TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_pcs_plan_component    (plan_id, component_type_id),
  KEY        idx_pcs_component_type   (component_type_id),
  KEY        idx_pcs_status           (status),

  CONSTRAINT fk_pcs_plan
    FOREIGN KEY (plan_id)           REFERENCES consulting_plans(id)    ON DELETE CASCADE,
  CONSTRAINT fk_pcs_component_type
    FOREIGN KEY (component_type_id) REFERENCES plan_component_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Per-component status tracking within a consulting plan';


-- ─────────────────────────────────────────────────────────────
-- 27. VISIT_TYPES  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE visit_types (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)      NOT NULL,
  description TEXT                 NULL,
  created_at  TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_visit_types_name (name)
) ENGINE=InnoDB
  COMMENT='Master list of field visit categories';


-- ─────────────────────────────────────────────────────────────
-- 28. VISITS
--     Every field visit logged by agronomists / DEOs.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE visits (
  id                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  visit_code           VARCHAR(20)      NOT NULL  COMMENT 'Human-readable ID, e.g. VIS-2026-00001',
  farmer_id            BIGINT UNSIGNED  NOT NULL,
  conducted_by_user_id BIGINT UNSIGNED  NOT NULL,
  visit_type_id        TINYINT UNSIGNED NOT NULL,
  related_plan_id      BIGINT UNSIGNED      NULL  COMMENT 'Plan this visit relates to (nullable)',
  scheduled_date       DATE                 NULL,
  visited_date         DATE                 NULL,
  location             VARCHAR(150)         NULL  COMMENT 'Free-text location shown in visit log, e.g. Petlad, Anand',
  status               ENUM('pending','completed','cancelled','overdue') NOT NULL DEFAULT 'pending',
  notes                TEXT                 NULL,
  created_at           TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_visits_visit_code         (visit_code),
  KEY        idx_visits_farmer_id         (farmer_id),
  KEY        idx_visits_conducted_by      (conducted_by_user_id),
  KEY        idx_visits_visit_type_id     (visit_type_id),
  KEY        idx_visits_related_plan_id   (related_plan_id),
  KEY        idx_visits_status            (status),
  KEY        idx_visits_visited_date      (visited_date),

  CONSTRAINT fk_visits_farmer
    FOREIGN KEY (farmer_id)            REFERENCES farmers(id)          ON DELETE RESTRICT,
  CONSTRAINT fk_visits_conducted_by
    FOREIGN KEY (conducted_by_user_id) REFERENCES users(id)            ON DELETE RESTRICT,
  CONSTRAINT fk_visits_visit_type
    FOREIGN KEY (visit_type_id)        REFERENCES visit_types(id)      ON DELETE RESTRICT,
  CONSTRAINT fk_visits_related_plan
    FOREIGN KEY (related_plan_id)      REFERENCES consulting_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Field visit records';


-- ─────────────────────────────────────────────────────────────
-- 29. FARM_PHOTOS
--     Photos attached to a farmer profile or a specific visit.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farm_photos (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farmer_id           BIGINT UNSIGNED NOT NULL,
  visit_id            BIGINT UNSIGNED     NULL  COMMENT 'Visit during which photo was taken',
  uploaded_by_user_id BIGINT UNSIGNED     NULL,
  caption             VARCHAR(255)        NULL,
  photo_url           VARCHAR(500)    NOT NULL,
  tag                 VARCHAR(60)         NULL  COMMENT 'field | irrigation | soil | compost | infrastructure | storage | fertilizer | visit',
  taken_at            DATE                NULL,
  created_at          TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_fp_farmer_id       (farmer_id),
  KEY idx_fp_visit_id        (visit_id),
  KEY idx_fp_uploaded_by     (uploaded_by_user_id),

  CONSTRAINT fk_fp_farmer
    FOREIGN KEY (farmer_id)           REFERENCES farmers(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_visit
    FOREIGN KEY (visit_id)            REFERENCES visits(id)  ON DELETE SET NULL,
  CONSTRAINT fk_fp_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Photos associated with farms and field visits';


-- ─────────────────────────────────────────────────────────────
-- 30. SCORING_FACTORS
--     Top-level factors used in the adoption score engine
--     (replaces flat scoring_configs).  Weights must sum to 100.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE scoring_factors (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40)      NOT NULL  COMMENT 'interest | water | chemical | training | participation',
  label       VARCHAR(100)     NOT NULL,
  description TEXT                 NULL,
  icon_class  VARCHAR(80)          NULL,
  color       VARCHAR(30)          NULL,
  weight      TINYINT UNSIGNED NOT NULL  DEFAULT 20  COMMENT 'Percentage weight; all rows must sum to 100',
  is_active   TINYINT(1)       NOT NULL  DEFAULT 1,
  created_at  TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sf_code (code)
) ENGINE=InnoDB
  COMMENT='Top-level factors for the farmer adoption scoring engine';


-- ─────────────────────────────────────────────────────────────
-- 30a. SCORING_FACTOR_OPTIONS
--      Selectable answer options per factor, each carrying a
--      raw score.  The weighted score = option.score_points
--      × (factor.weight / 100).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE scoring_factor_options (
  id               SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scoring_factor_id TINYINT UNSIGNED NOT NULL,
  label            VARCHAR(100)      NOT NULL  COMMENT 'e.g. High, Medium, Low; Perennial, Seasonal',
  score_points     TINYINT UNSIGNED  NOT NULL  COMMENT 'Raw points (0–100) for this option',
  display_order    TINYINT UNSIGNED  NOT NULL  DEFAULT 0,
  created_at       TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_sfo_factor_id (scoring_factor_id),

  CONSTRAINT fk_sfo_factor
    FOREIGN KEY (scoring_factor_id) REFERENCES scoring_factors(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Answer options per scoring factor with their raw score contribution';


-- ─────────────────────────────────────────────────────────────
-- 31. NOTIFICATION_PREFERENCES
--     Per-user opt-in / opt-out for notification channels.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notification_preferences (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  notification_type VARCHAR(60)     NOT NULL  COMMENT 'visitReminders | planUpdates | newAssignments',
  is_enabled        TINYINT(1)      NOT NULL  DEFAULT 1,
  created_at        TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_np_user_type (user_id, notification_type),

  CONSTRAINT fk_np_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Per-user notification opt-in preferences';


-- ─────────────────────────────────────────────────────────────
-- 32. DRAFT_REGISTRATIONS
--     Auto-saved partial farmer registration forms
--     (powers the DraftListPage for agronomists / DEOs).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE draft_registrations (
  id                 BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  created_by_user_id BIGINT UNSIGNED  NOT NULL,
  form_data          JSON             NOT NULL  COMMENT 'Partial registration payload as JSON',
  step_reached       TINYINT UNSIGNED NOT NULL  DEFAULT 1,
  expires_at         TIMESTAMP        NOT NULL,
  created_at         TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_dr_created_by  (created_by_user_id),
  KEY idx_dr_expires_at  (expires_at),

  CONSTRAINT fk_dr_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Auto-saved draft forms for farmer registration';


-- ─────────────────────────────────────────────────────────────
-- 33. ACTIVITY_LOGS
--     Append-only audit trail.  Never UPDATE or DELETE rows.
--     entity_type + entity_id form a polymorphic reference.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED     NULL  COMMENT 'Actor; NULL = system event',
  farmer_id   BIGINT UNSIGNED     NULL  COMMENT 'Affected farmer when applicable',
  action_type VARCHAR(80)     NOT NULL  COMMENT 'plan_updated | visit_completed | farmer_registered | …',
  entity_type VARCHAR(60)         NULL  COMMENT 'Table name of affected entity',
  entity_id   BIGINT UNSIGNED     NULL  COMMENT 'PK of affected row',
  description TEXT                NULL,
  ip_address  VARCHAR(45)         NULL  COMMENT 'IPv4 or IPv6 of the requesting client',
  metadata    JSON                NULL  COMMENT 'Arbitrary structured context',
  created_at  TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_al_user_id     (user_id),
  KEY idx_al_farmer_id   (farmer_id),
  KEY idx_al_action_type (action_type),
  KEY idx_al_entity      (entity_type, entity_id),
  KEY idx_al_created_at  (created_at),

  CONSTRAINT fk_al_user
    FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_al_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Immutable audit trail for all significant platform events';


-- ============================================================
-- REFERENCE SEED DATA  (static master lists)
-- ============================================================

-- Hierarchy: Leadership (manager) → Manager (admin) → Team Lead (team_lead)
--            → {Agronomist, Data Entry Operator}
INSERT INTO roles (name, display_name, description) VALUES
  ('agronomist',          'Agronomist',          'Field representative who registers farmers and manages consulting plans'),
  ('team_lead',           'Team Lead',           'Manages a team of Field Representatives and Data Entry Operators; configures forms for their team'),
  ('manager',             'Leadership',          'Top-level leadership with full platform visibility across all territories'),
  ('admin',               'Manager',             'Manages multiple Team Leads and oversees regional operations'),
  ('data_entry_operator', 'Data Entry Operator', 'Registers farmer data on behalf of agronomists'),
  ('farmer_self_service', 'Farmer (Self-Service)', 'Farmer with limited read-only access to own profile');

INSERT INTO plan_component_types (code, label, icon_class, display_order) VALUES
  ('irrigation',    'Irrigation Plan',   'fas fa-tint',         1),
  ('fertilizer',    'Fertilizer Plan',   'fas fa-seedling',     2),
  ('spray',         'Spray Schedule',    'fas fa-spray-can',    3),
  ('crop_advisory', 'Crop Advisory',     'fas fa-leaf',         4);

INSERT INTO visit_types (name) VALUES
  ('Irrigation Check'),
  ('Fertilizer Advisory'),
  ('Spray Schedule'),
  ('Crop Advisory'),
  ('General Visit'),
  ('Follow-up');

INSERT INTO challenges (name) VALUES
  ('Pest/Disease'),
  ('Water Scarcity'),
  ('Soil Degradation'),
  ('Market Access'),
  ('Finance'),
  ('Labour Shortage'),
  ('Climate Risk');

INSERT INTO govt_schemes (name) VALUES
  ('PM-KUSUM'),
  ('PKVY'),
  ('NHM'),
  ('MGNREGS'),
  ('FPO Membership'),
  ('None');

INSERT INTO inputs (name, type) VALUES
  ('Chemical Fertilizer', 'chemical_fertilizer'),
  ('Pesticides',          'pesticide'),
  ('Bio-fertilizer',      'bio_fertilizer'),
  ('Compost / FYM',       'compost'),
  ('Jeevamrut',           'jeevamrut'),
  ('Neem Products',       'neem_product');

INSERT INTO irrigation_infrastructure_types (name) VALUES
  ('Drip System'),
  ('Sprinkler'),
  ('Pump Set'),
  ('None');

INSERT INTO crops (name, category, season) VALUES
  ('Cotton',     'Cash Crop',  'Kharif'),
  ('Wheat',      'Cereal',     'Rabi'),
  ('Rice',       'Cereal',     'Kharif'),
  ('Groundnut',  'Oilseed',    'Kharif'),
  ('Banana',     'Fruit',      'Perennial'),
  ('Sugarcane',  'Cash Crop',  'Perennial'),
  ('Vegetables', 'Vegetable',  NULL),
  ('Maize',      'Cereal',     'Kharif'),
  ('Soybean',    'Oilseed',    'Kharif'),
  ('Bajra',      'Cereal',     'Kharif'),
  ('Jowar',      'Cereal',     'Rabi'),
  ('Castor',     'Oilseed',    'Kharif'),
  ('Turmeric',   'Spice',      'Kharif'),
  ('Chilli',     'Spice',      'Kharif'),
  ('Onion',      'Vegetable',  'Rabi');

INSERT INTO scoring_factors (code, label, description, weight) VALUES
  ('interest',       'Farmer Interest',        'How interested the farmer is in adopting new practices',    20),
  ('water',          'Water Availability',     'Reliability of the water source for irrigation',            20),
  ('chemical',       'Chemical Dependency',    'Current level of chemical input usage (lower = better)',    20),
  ('training',       'Training Willingness',   'Openness to participate in agricultural training',          20),
  ('participation',  'Program Participation',  'History of participation in govt or NGO agri programmes',  20);

INSERT INTO scoring_factor_options (scoring_factor_id, label, score_points, display_order) VALUES
  -- Interest
  (1, 'High',             100, 1),
  (1, 'Medium',            55, 2),
  (1, 'Low',               10, 3),
  -- Water
  (2, 'Perennial',        100, 1),
  (2, 'Seasonal',          60, 2),
  (2, 'Rain-fed',          20, 3),
  -- Chemical dependency
  (3, 'Organic already',  100, 1),
  (3, 'Partial',           55, 2),
  (3, 'Fully chemical',    10, 3),
  -- Training willingness
  (4, 'Very willing',     100, 1),
  (4, 'Moderate',          55, 2),
  (4, 'Not willing',       10, 3),
  -- Participation
  (5, 'Has participated', 100, 1),
  (5, 'Aware',             50, 2),
  (5, 'No exposure',       10, 3);


-- ============================================================
-- EXTENDED TABLES  (OnboardUserPage, ImportFarmersPage,
--   ImpersonatePage, CropMasterPage, ActivityLogPage extras)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 34. LANGUAGES  (master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE languages (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(60)      NOT NULL,
  created_at TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_languages_name (name)
) ENGINE=InnoDB
  COMMENT='Languages master list';

INSERT INTO languages (name) VALUES
  ('Hindi'), ('Marathi'), ('Gujarati'), ('Kannada'),
  ('Telugu'), ('Tamil'), ('Punjabi'), ('Bengali'), ('English');


-- ─────────────────────────────────────────────────────────────
-- 35. USER_LANGUAGES  (pivot — users ↔ languages)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_languages (
  user_id     BIGINT UNSIGNED  NOT NULL,
  language_id TINYINT UNSIGNED NOT NULL,

  PRIMARY KEY (user_id, language_id),
  KEY idx_ul_language_id (language_id),

  CONSTRAINT fk_ul_user
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_ul_language
    FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: users ↔ languages spoken';


-- ─────────────────────────────────────────────────────────────
-- 36. USER_EMERGENCY_CONTACTS
--     Emergency contact details collected during onboarding.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_emergency_contacts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(120)    NOT NULL,
  relation   VARCHAR(60)         NULL,
  mobile     VARCHAR(15)     NOT NULL,
  created_at TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_uec_user_id (user_id),

  CONSTRAINT fk_uec_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Emergency contacts for platform users';


-- ─────────────────────────────────────────────────────────────
-- 37. USER_DOCUMENTS
--     HR / compliance documents uploaded during onboarding.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_documents (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  document_type ENUM(
                  'aadhaar_card',
                  'pan_card',
                  'photo_id',
                  'address_proof',
                  'appointment_letter',
                  'education_certificate',
                  'other'
                )               NOT NULL,
  file_url      VARCHAR(500)    NOT NULL,
  file_name     VARCHAR(255)        NULL,
  uploaded_by_user_id BIGINT UNSIGNED NULL,
  uploaded_at   TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_ud_user_id      (user_id),
  KEY idx_ud_uploaded_by  (uploaded_by_user_id),

  CONSTRAINT fk_ud_user
    FOREIGN KEY (user_id)             REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ud_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='Compliance and HR documents attached to user profiles';


-- ─────────────────────────────────────────────────────────────
-- 38. USER_DEVICES
--     Registered devices for mobile / OTP login (Device & Access
--     section of OnboardUserPage).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_devices (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  device_type VARCHAR(60)         NULL  COMMENT 'Android | iOS | Web | Tablet',
  device_id   VARCHAR(255)        NULL  COMMENT 'Hardware or push-notification token',
  is_active   TINYINT(1)      NOT NULL  DEFAULT 1,
  registered_at TIMESTAMP     NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  last_used_at  TIMESTAMP         NULL,
  created_at  TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_udev_user_id (user_id),

  CONSTRAINT fk_udev_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Devices registered for a user login';


-- ─────────────────────────────────────────────────────────────
-- 39. FARMER_AWARENESS_PROGRAMS  (master)
--     Government / NGO awareness programs a farmer may attend
--     (RegisterFarmerPage Step 6 — awareness[] field).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_awareness_programs (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)      NOT NULL,
  organiser   VARCHAR(120)          NULL,
  description TEXT                  NULL,
  created_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_fap_name (name)
) ENGINE=InnoDB
  COMMENT='Master list of awareness programmes farmers can attend';


-- ─────────────────────────────────────────────────────────────
-- 40. FARMER_AWARENESS  (pivot — farmers ↔ awareness programs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE farmer_awareness (
  farmer_id  BIGINT UNSIGNED   NOT NULL,
  program_id SMALLINT UNSIGNED NOT NULL,
  attended_at DATE                 NULL,
  created_at TIMESTAMP         NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (farmer_id, program_id),
  KEY idx_fa_program_id (program_id),

  CONSTRAINT fk_fa_farmer
    FOREIGN KEY (farmer_id)  REFERENCES farmers(id)                   ON DELETE CASCADE,
  CONSTRAINT fk_fa_program
    FOREIGN KEY (program_id) REFERENCES farmer_awareness_programs(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Many-to-many: farmers ↔ awareness programmes attended';


-- ─────────────────────────────────────────────────────────────
-- 41. IMPERSONATE_SESSIONS
--     Short-lived tokens issued when a manager clicks "View As"
--     or "New Tab" on ImpersonatePage.  Used for audit trail.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE impersonate_sessions (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requested_by_user_id BIGINT UNSIGNED NOT NULL  COMMENT 'Manager who initiated impersonation',
  target_user_id       BIGINT UNSIGNED NOT NULL  COMMENT 'User being impersonated',
  token_hash           VARCHAR(255)        NULL  COMMENT 'Hashed short-lived token for new-tab handshake',
  expires_at           TIMESTAMP       NOT NULL,
  used_at              TIMESTAMP           NULL  COMMENT 'Timestamp when token was consumed',
  ip_address           VARCHAR(45)         NULL,
  created_at           TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_is_requested_by (requested_by_user_id),
  KEY idx_is_target       (target_user_id),
  KEY idx_is_expires_at   (expires_at),

  CONSTRAINT fk_is_requested_by
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_is_target
    FOREIGN KEY (target_user_id)       REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Audit trail of manager impersonation sessions';


-- ─────────────────────────────────────────────────────────────
-- 42. BULK_IMPORT_LOGS
--     History of CSV / XLSX farmer import jobs
--     (ImportFarmersPage).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE bulk_import_logs (
  id                  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  imported_by_user_id BIGINT UNSIGNED  NOT NULL,
  file_name           VARCHAR(255)         NULL,
  file_type           ENUM('csv','xlsx')   NULL,
  total_rows          SMALLINT UNSIGNED    NULL,
  success_count       SMALLINT UNSIGNED    NULL  DEFAULT 0,
  error_count         SMALLINT UNSIGNED    NULL  DEFAULT 0,
  skipped_count       SMALLINT UNSIGNED    NULL  DEFAULT 0,
  status              ENUM('processing','completed','failed','partial') NOT NULL DEFAULT 'processing',
  error_details       JSON                 NULL  COMMENT 'Row-level validation errors',
  created_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_bil_imported_by (imported_by_user_id),
  KEY idx_bil_status      (status),

  CONSTRAINT fk_bil_imported_by
    FOREIGN KEY (imported_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='History of bulk CSV/XLSX farmer import jobs';


-- ─────────────────────────────────────────────────────────────
-- 44. DEO_CAPTURE_TARGETS
--     Daily capture targets for Data Entry Operators.
--     DEODashboardPage shows QUOTA = { captured, target } that
--     resets each calendar day.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE deo_capture_targets (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED  NOT NULL  COMMENT 'DEO user',
  target_date    DATE             NOT NULL  COMMENT 'Calendar day this quota applies to',
  daily_target   SMALLINT UNSIGNED NOT NULL DEFAULT 8,
  captured_count SMALLINT UNSIGNED NOT NULL DEFAULT 0  COMMENT 'Incremented on each farmer registration',
  created_at     TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_dct_user_date (user_id, target_date),
  KEY idx_dct_target_date (target_date),

  CONSTRAINT fk_dct_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
  COMMENT='Daily farmer-registration capture targets per DEO';


-- ─────────────────────────────────────────────────────────────
-- 45. REPORT_EXPORTS
--     Audit log of every CSV / PDF export action triggered via
--     the export_reports permission (Supervisor / Manager /
--     Admin report pages).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE report_exports (
  id                  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  exported_by_user_id BIGINT UNSIGNED  NOT NULL,
  report_type         VARCHAR(80)      NOT NULL  COMMENT 'plan_completion | rep_performance | adoption_funnel | visit_coverage | …',
  export_format       ENUM('csv','pdf','xlsx') NOT NULL DEFAULT 'csv',
  filters_applied     JSON                 NULL  COMMENT 'Snapshot of filter state at time of export',
  row_count           INT UNSIGNED         NULL,
  file_url            VARCHAR(500)         NULL  COMMENT 'Signed download URL if stored on object storage',
  created_at          TIMESTAMP        NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_re_exported_by  (exported_by_user_id),
  KEY idx_re_report_type  (report_type),
  KEY idx_re_created_at   (created_at),

  CONSTRAINT fk_re_exported_by
    FOREIGN KEY (exported_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB
  COMMENT='Audit log of every report export (CSV / PDF / XLSX)';


-- ─────────────────────────────────────────────────────────────
-- 43. SYSTEM_BACKUPS
--     Database/system backup run history visible in
--     ActivityLogPage (Backup History tab).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE system_backups (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_type          ENUM('full','incremental','differential') NOT NULL DEFAULT 'full',
  status               ENUM('running','completed','failed')      NOT NULL DEFAULT 'running',
  file_size_mb         DECIMAL(10,2)       NULL,
  destination          VARCHAR(255)        NULL  COMMENT 'Storage path or cloud bucket',
  triggered_by_user_id BIGINT UNSIGNED     NULL  COMMENT 'NULL = scheduled / automated',
  started_at           TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  completed_at         TIMESTAMP           NULL,
  notes                TEXT                NULL,
  created_at           TIMESTAMP       NOT NULL  DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_sb_triggered_by (triggered_by_user_id),
  KEY idx_sb_status       (status),

  CONSTRAINT fk_sb_triggered_by
    FOREIGN KEY (triggered_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB
  COMMENT='System and database backup run history';


-- ─────────────────────────────────────────────────────────────
-- SEED: PERMISSIONS + ROLE_PERMISSIONS
-- ─────────────────────────────────────────────────────────────

INSERT IGNORE INTO permissions (name, display_name, module) VALUES
  ('view_farmers',   'View Farmers',   'farmers'),
  ('create_farmer',  'Create Farmer',  'farmers'),
  ('edit_farmer',    'Edit Farmer',    'farmers'),
  ('delete_farmer',  'Delete Farmer',  'farmers'),
  ('view_visits',    'View Visits',    'visits'),
  ('create_visit',   'Create Visit',   'visits'),
  ('view_plans',     'View Plans',     'plans'),
  ('create_plan',    'Create Plan',    'plans'),
  ('approve_plan',   'Approve Plan',   'plans'),
  ('view_reports',   'View Reports',   'reports'),
  ('export_reports', 'Export Reports', 'reports'),
  ('view_settings',  'View Settings',  'settings'),
  ('edit_settings',  'Edit Settings',  'settings'),
  ('manage_users',   'Manage Users',   'admin'),
  ('manage_roles',   'Manage Roles',   'admin'),
  ('view_audit_log', 'View Audit Log', 'admin');

-- Agronomist
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'agronomist'
  AND p.name IN ('view_farmers','create_farmer','edit_farmer',
                 'view_visits','create_visit','view_plans','create_plan',
                 'view_reports','view_settings','edit_settings');

-- Supervisor
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'team_lead'
  AND p.name IN (
    'view_farmers','create_farmer','edit_farmer','view_visits','create_visit',
    'view_plans','approve_plan','view_reports','export_reports',
    'view_settings','edit_settings','manage_users','manage_roles'
  );

-- Manager (all)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'manager';

-- Admin (all)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- Data Entry Operator
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'data_entry_operator'
  AND p.name IN ('view_farmers','create_farmer','view_visits','create_visit','view_settings');
