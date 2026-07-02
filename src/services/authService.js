/**
 * authService.js — Authentication business logic.
 *
 * ── Layer responsibilities ──────────────────────────────────────────────
 *
 *   authService  →  api.js (transport)  →  server
 *   AuthContext  →  authService         (state management only)
 *
 * ── Environment variables ───────────────────────────────────────────────
 *   VITE_AUTH_LOGIN_ENDPOINT    — POST endpoint for login  (default /auth/login)
 *   VITE_AUTH_OTP_ENDPOINT      — POST endpoint for OTP    (default /auth/verify-otp)
 *   VITE_AUTH_LOGOUT_ENDPOINT   — POST endpoint for logout (default /auth/logout)
 *   VITE_DEMO_MOBILE            — Demo mobile (dev only, never in production)
 *   VITE_DEMO_PASSWORD          — Demo password (dev only, never in production)
 *
 * ── Switching to real API ───────────────────────────────────────────────
 *   1. Set VITE_API_BASE_URL in .env.local.
 *   2. In each function, comment out the "── Mock" block.
 *   3. Uncomment the "── Real API" block.
 *   4. Remove VITE_DEMO_MOBILE / VITE_DEMO_PASSWORD from .env.local.
 *
 * @module authService
 */

import { apiFetch, storeToken, clearToken } from '@services/api';
import SYSTEM_USERS from '@data/mock/users.json';

// ── Login attempt tracking (account lockout — FR-01c) ────────────────────────────
/** Maximum failed attempts before a lockout is triggered. */
const MAX_ATTEMPTS = 5;
/** Lockout duration in milliseconds (15 minutes). */
const LOCK_DURATION_MS = 15 * 60 * 1000;
/**
 * @type {Map<string, { count: number, lockedUntil: number }>}
 * Keyed by mobile number. Cleared on successful login.
 */
const loginAttempts = new Map();

function recordFailedAttempt(mobile) {
  const current = loginAttempts.get(mobile) ?? { count: 0, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= MAX_ATTEMPTS) {
    current.lockedUntil = Date.now() + LOCK_DURATION_MS;
    current.count = 0; // reset counter; lockedUntil now gates future logins
  }
  loginAttempts.set(mobile, current);
  return current;
}

// ── Auth endpoint paths (from env, safe defaults) ─────────────────────
const EP_LOGIN  = import.meta.env.VITE_AUTH_LOGIN_ENDPOINT  ?? '/auth/login';
const EP_OTP    = import.meta.env.VITE_AUTH_OTP_ENDPOINT    ?? '/auth/verify-otp';
const EP_LOGOUT = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT ?? '/auth/logout';

// ── Demo users table (dev/staging only, never hardcoded) ─────────────
// To add a new role: append one entry with its env vars.
// To go live: comment out the Mock block inside signIn and uncomment Real API.
const DEMO_USERS = [
  // Farmer Representative
  import.meta.env.VITE_DEMO_AGRONOMIST_MOBILE && {
    mobile:   import.meta.env.VITE_DEMO_AGRONOMIST_MOBILE,
    password: import.meta.env.VITE_DEMO_AGRONOMIST_PASSWORD ?? '',
    user: { name: 'Dr. Ravi Desai', role: 'agronomist', initials: 'RD' },
  },
  // Team Lead
  import.meta.env.VITE_DEMO_SUPERVISOR_MOBILE && {
    mobile:   import.meta.env.VITE_DEMO_SUPERVISOR_MOBILE,
    password: import.meta.env.VITE_DEMO_SUPERVISOR_PASSWORD ?? '',
    user: { name: 'Priya Kulkarni', role: 'team_lead', initials: 'PK' },
  },
  // Manager (Admin)
  import.meta.env.VITE_DEMO_ADMIN_MOBILE && {
    mobile:   import.meta.env.VITE_DEMO_ADMIN_MOBILE,
    password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? '',
    user: { name: 'Vijay Pawar', role: 'admin', initials: 'VP' },
  },
  // Data Entry Operator
  import.meta.env.VITE_DEMO_DEO_MOBILE && {
    mobile:   import.meta.env.VITE_DEMO_DEO_MOBILE,
    password: import.meta.env.VITE_DEMO_DEO_PASSWORD ?? '',
    user: { name: 'Anita Shinde', role: 'data_entry_operator', initials: 'AS' },
  },
  // Manager (Leadership)
  import.meta.env.VITE_DEMO_MANAGER_MOBILE && {
    mobile:   import.meta.env.VITE_DEMO_MANAGER_MOBILE,
    password: import.meta.env.VITE_DEMO_MANAGER_PASSWORD ?? '',
    user: { name: 'Ramesh Jadhav', role: 'manager', initials: 'RJ' },
  },
].filter(Boolean);

/**
 * @typedef {Object} AuthUser
 * @property {string} mobile
 * @property {string} name
 * @property {string} role     - Matches a key from ROLES enum
 * @property {string} initials
 */

/**
 * Authenticate with mobile number + password.
 * Returns the authenticated user object on success; throws on failure.
 *
 * @param {string} mobile
 * @param {string} password
 * @returns {Promise<{ user: AuthUser }>}
 */
export async function signIn(mobile, password) {
  // ── Account lockout check (FR-01c) ───────────────────────────────
  const attempt = loginAttempts.get(mobile);
  if (attempt?.lockedUntil && Date.now() < attempt.lockedUntil) {
    const remainingMin = Math.ceil((attempt.lockedUntil - Date.now()) / 60_000);
    throw new Error(
      `Account is temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`
    );
  }

  // ── Real API ──────────────────────────────────────────────────────
  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  let response;
  try {
    response = await fetch(`${BASE}${EP_LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data.detail ?? 'Invalid mobile number or password.';
    recordFailedAttempt(mobile);
    throw new Error(detail);
  }

  const { access_token, user } = await response.json();
  storeToken(access_token);
  loginAttempts.delete(mobile);
  return { user };
}

/**
 * Verify OTP (second-factor auth).
 * On success the server should return a fresh JWT + user object.
 *
 * @param {string} mobile
 * @param {string} otp
 * @returns {Promise<{ user: AuthUser }>}
 */
export async function verifyOtp(mobile, otp) {
  // ── Mock (remove when API is live) ───────────────────────────────
  if (otp.length !== 6) throw new Error('OTP must be 6 digits.');
  return {
    user: { mobile, name: 'Dr. Ravi Desai', role: 'AGRONOMIST', initials: 'RD' },
  };

  // ── Real API (uncomment when ready) ──────────────────────────────
  // const { user, token } = await apiFetch(EP_OTP, {
  //   method: 'POST',
  //   body: JSON.stringify({ mobile, otp }),
  // });
  // storeToken(token);
  // return { user };
}

/**
 * Invalidate the session on the server and clear the local token.
 * Safe to call even if already logged out.
 *
 * @returns {Promise<void>}
 */
/**
 * Change a user's password.
 * Verifies the current password before storing the new one in localStorage.
 * MOCK-ONLY: replace with a real API call when the backend is live.
 *
 * @param {string} mobile
 * @param {string} currentPwd
 * @param {string} newPwd
 * @returns {Promise<void>}
 */
export async function changePassword(_mobile, currentPwd, newPwd) {
  await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
  });
}

/**
 * Return the full system user list (profile data only, no passwords).
 * @returns {object[]}
 */
export function getSystemUsers() {
  return SYSTEM_USERS;
}

export async function signOut() {
  try { await apiFetch(EP_LOGOUT, { method: 'POST' }); } catch { /* ignore — server may already have rejected the token */ }
  clearToken();
}

