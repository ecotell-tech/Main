/**
 * authService.js — Authentication business logic.
 *
 * ── Layer responsibilities ──────────────────────────────────────────────
 *
 *   authService  →  api.js (transport)  →  server
 *   AuthContext  →  authService         (state management only)
 *
 * ── Environment variables ───────────────────────────────────────────────
 *   VITE_AUTH_LOGIN_ENDPOINT     — POST endpoint for login    (default /auth/login)
 *   VITE_AUTH_SEND_OTP_ENDPOINT  — POST endpoint to send OTP  (default /auth/send-otp)
 *   VITE_AUTH_OTP_ENDPOINT       — POST endpoint to verify OTP (default /auth/verify-otp)
 *   VITE_AUTH_LOGOUT_ENDPOINT    — POST endpoint for logout   (default /auth/logout)
 *
 * @module authService
 */

import { apiFetch, storeToken, clearToken } from '@services/api';

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
const EP_LOGIN    = import.meta.env.VITE_AUTH_LOGIN_ENDPOINT    ?? '/auth/login';
const EP_SEND_OTP = import.meta.env.VITE_AUTH_SEND_OTP_ENDPOINT ?? '/auth/send-otp';
const EP_OTP      = import.meta.env.VITE_AUTH_OTP_ENDPOINT      ?? '/auth/verify-otp';
const EP_LOGOUT   = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT   ?? '/auth/logout';

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
 * Request an OTP be generated for this mobile number.
 * No SMS gateway send integration exists yet — the backend logs the code
 * server-side (visible via `docker logs backend`) instead of texting it.
 *
 * @param {string} mobile
 * @returns {Promise<{ expiresIn: number }>} Real server-side OTP TTL in seconds.
 */
export async function sendOtp(mobile) {
  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  let response;
  try {
    response = await fetch(`${BASE}${EP_SEND_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? 'Failed to send OTP.');
  }

  const { expires_in } = await response.json();
  return { expiresIn: expires_in };
}

/**
 * Verify OTP (second-factor auth). On success the server returns a fresh
 * JWT + user object, same shape as signIn().
 *
 * @param {string} mobile
 * @param {string} otp
 * @returns {Promise<{ user: AuthUser }>}
 */
export async function verifyOtp(mobile, otp) {
  const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
  let response;
  try {
    response = await fetch(`${BASE}${EP_OTP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp }),
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection.');
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? 'Invalid or expired OTP.');
  }

  const { access_token, user } = await response.json();
  storeToken(access_token);
  return { user };
}

/**
 * Change a user's password.
 * Verifies the current password server-side before storing the new hash.
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
 * Invalidate the session on the server and clear the local token.
 * Safe to call even if already logged out.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
  try { await apiFetch(EP_LOGOUT, { method: 'POST' }); } catch { /* ignore — server may already have rejected the token */ }
  clearToken();
}

