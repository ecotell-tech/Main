/**
 * api.js — Secure HTTP client layer.
 *
 * ── Architecture ────────────────────────────────────────────────────────
 *
 *   .env  →  api.js (transport)  →  authService / *Service  →  components
 *
 *  All config (base URL, session key) comes from environment variables.
 *  No credentials or secrets are ever hardcoded here.
 *
 * ── Environment variables (set in .env.local) ───────────────────────────
 *   VITE_API_BASE_URL   — API server root, e.g. https://api.example.com
 *   VITE_SESSION_KEY    — sessionStorage key for the JWT token
 *
 * ── Usage ───────────────────────────────────────────────────────────────
 *   import { apiFetch } from '@services/api';
 *   const farmers = await apiFetch('/farmers');          // GET
 *   const result  = await apiFetch('/farmers', {         // POST
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   });
 */

// ── Config from environment (zero hardcoded strings) ──────────────────
const BASE_URL     = import.meta.env.VITE_API_BASE_URL ?? '';
const SESSION_KEY  = import.meta.env.VITE_SESSION_KEY  ?? 'pscms_session';

// ── Custom error class (lets callers check err.status) ────────────────
export class ApiError extends Error {
  /**
   * @param {number} status   - HTTP status code
   * @param {string} message  - Human-readable message
   */
  constructor(status, message) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}

// ── Token helpers (used by authService only) ──────────────────────────

/** Store JWT returned by the auth endpoint. */
export function storeToken(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}

/** Remove token on logout or session expiry. */
export function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Read the current JWT (null if not authenticated). */
export function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

// ── CSRF token helper ──────────────────────────────────────────────────────────

/** HTTP methods that must carry a CSRF token. */
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Read the CSRF token injected by the server into <meta name="csrf-token">.
 * Returns an empty string in dev / mock mode when no server is present.
 */
function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

// ── Error message extraction ────────────────────────────────────────────
// FastAPI error bodies are JSON: { "detail": "..." } for a plain message,
// or { "detail": [{ "msg": "...", ... }, ...] } for 422 validation errors.
// Parse that shape into clean, human-readable text instead of surfacing the
// raw JSON (or a stack trace) to the user.
async function extractErrorMessage(response) {
  const raw = await response.text().catch(() => '');
  if (!raw) return `Request failed (${response.status})`;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return raw; // not JSON — a plain-text error body, show as-is
  }

  const { detail } = data;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ');
  }
  return `Request failed (${response.status})`;
}

// ── Core fetch wrapper ────────────────────────────────────────────────

/**
 * Make an authenticated API request.
 *
 * - Automatically attaches `Authorization: Bearer <token>` when a token exists.
 * - On HTTP 401: clears the token and dispatches a global `auth:logout` event
 *   so AuthContext can redirect to login — no coupling between layers needed.
 * - On any non-2xx: throws `ApiError` with `.status` set.
 * - On HTTP 204 (No Content): returns `null`.
 *
 * @template T
 * @param {string}      endpoint  - Path relative to VITE_API_BASE_URL, e.g. '/farmers'
 * @param {RequestInit} [options] - Any fetch init options (method, body, headers…)
 * @returns {Promise<T>}
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  const { headers: extraHeaders, ...restOptions } = options;

  const method = (restOptions.method ?? 'GET').toUpperCase();
  const csrfHeader = CSRF_METHODS.has(method) ? { 'X-CSRF-Token': getCsrfToken() } : {};

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...csrfHeader,
      ...extraHeaders,
    },
  });

  // 401 — token invalid or expired: auto-logout without importing AuthContext
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('auth:logout'));
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  // 204 No Content
  if (response.status === 204) return /** @type {T} */ (null);

  return /** @type {Promise<T>} */ (response.json());
}
