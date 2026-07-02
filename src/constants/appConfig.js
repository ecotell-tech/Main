/**
 * appConfig.js — Application-wide UI & brand configuration.
 *
 * ── What belongs here ───────────────────────────────────────────────────
 *   Brand identity, UI thresholds, pagination, OTP settings.
 *
 * ── What does NOT belong here ───────────────────────────────────────────
 *   Auth credentials → .env (VITE_DEMO_MOBILE / VITE_DEMO_PASSWORD)
 *   Session/token keys → .env (VITE_SESSION_KEY)
 *   API base URL → .env (VITE_API_BASE_URL)
 *   Form option lists → src/data/config/formOptions.json
 *   Geographic data → src/data/config/stateDistricts.json
 */
export const APP_CONFIG = Object.freeze({
  brand: {
    name:        'Pruthashakti',
    tagline:     'Kisan Kalyan Mission',
    description: 'Farmers Welfare & Social Security',
    version:     'v1.1',
    developer:   'techyogi.in',
    year:        2026,
    logoSrc:     '/assets/images/logo.svg',
    /** Feature highlights shown on the login brand panel. */
    features: [
      { icon: 'fas fa-users',          text: 'Manage field representatives and capture structured farmer data' },
      { icon: 'fas fa-seedling',       text: 'Identify and shortlist farmers ready for organic farming adoption' },
      { icon: 'fas fa-chart-line',     text: 'Real-time dashboards with multilayer filters and performance reports' },
      { icon: 'fas fa-clipboard-list', text: 'End-to-end consulting: irrigation, fertilizer, spray & crop advisory' },
    ],
  },

  /** Adoption readiness score thresholds — used in UI across multiple screens. */
  adoptionBands: [
    { label: 'High',   range: '70–100', min: 70, color: '#A5D6A7', bg: 'rgba(76,175,80,0.3)' },
    { label: 'Medium', range: '40–69',  min: 40, color: '#FFD54F', bg: 'rgba(245,166,35,0.25)' },
    { label: 'Low',    range: '0–39',   min: 0,  color: '#BCAAA4', bg: 'rgba(109,76,65,0.35)' },
  ],

  pagination: {
    defaultPageSize: 10,
  },

  otp: {
    lengthDigits:  6,
    expirySeconds: 120,
  },
});

/**
 * Sidebar + BottomNav navigation configuration.
 *
 * `mobileLabel` — shorter label for the mobile bottom nav (optional).
 * `bottomNav`   — true = include this item in the 5-item mobile bottom nav.
 */
export const NAV_ITEMS = Object.freeze([
  {
    section: 'Main Menu',
    items: [
      { page: 'dashboard', label: 'Dashboard',      mobileLabel: 'Home',     icon: 'fas fa-home',           sub: 'Overview of your consulting activities',           bottomNav: true },
      { page: 'farmers',   label: 'My Farmers',     mobileLabel: 'Farmers',  icon: 'fas fa-users',          sub: 'Farmers assigned to you for consulting', badge: 24, bottomNav: true },
      { page: 'visits',    label: 'Visit Log',      mobileLabel: 'Visits',   icon: 'fas fa-calendar-check', sub: 'Log and review field visits',                      bottomNav: true },
      { page: 'register',  label: 'Register Farmer',mobileLabel: 'Register', icon: 'fas fa-user-plus',      sub: 'Register a new farmer with full profile',          bottomNav: true },
    ],
  },
  {
    section: 'Reports',
    items: [
      { page: 'reports', label: 'Reports', mobileLabel: 'Reports', icon: 'fas fa-chart-bar', sub: 'Plan completion and visit coverage reports', bottomNav: true },
    ],
  },
  {
    section: 'Settings',
    items: [
      { page: 'settings', label: 'Settings', icon: 'fas fa-cog', sub: 'Account and notification preferences' },
    ],
  },
]);

/**
 * Flattened list of bottom-nav items derived from NAV_ITEMS.
 * Single source of truth — no separate BOTTOM_NAV array anywhere.
 */
export const BOTTOM_NAV_ITEMS = Object.freeze(
  NAV_ITEMS.flatMap((s) => s.items).filter((item) => item.bottomNav),
);

