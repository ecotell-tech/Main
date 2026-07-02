/**
 * AuthContext.jsx — React authentication state layer.
 *
 * ── Responsibilities (this file only) ──────────────────────────────────
 *   • Hold `currentUser` in React state (in-memory, tab-scoped).
 *   • Persist the user object in sessionStorage so a page refresh
 *     keeps the user logged in within the same tab.
 *   • Delegate ALL auth logic (credential checks, token handling)
 *     to authService — no credentials or fetch calls here.
 *   • Listen for the global `auth:logout` event dispatched by api.js
 *     on 401 responses, and auto-clear state.
 *
 * ── Layer map ───────────────────────────────────────────────────────────
 *   AuthContext  →  authService  →  api.js  →  server
 */

import {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react';
import { useNavigate }  from 'react-router-dom';
import { ROUTES }       from '@constants/routes';
import * as authService from '@services/authService';
import { storeToken }   from '@services/api';

// ── Session persistence key (env-driven, never hardcoded) ─────────────
const USER_KEY      = `${import.meta.env.VITE_SESSION_KEY ?? 'pscms_session'}_user`;
const REAL_USER_KEY = `${import.meta.env.VITE_SESSION_KEY ?? 'pscms_session'}_real`;

/**
 * Key used to pass an impersonation token to a newly-opened tab.
 * Exported so ImpersonatePage can write the token without importing the key string.
 */
export const PENDING_IMPERSONATE_KEY = `${import.meta.env.VITE_SESSION_KEY ?? 'pscms_session'}_pending_imp`;

/** How long (ms) a new-tab impersonation token remains valid after being written. */
const PENDING_IMP_TTL = 15_000;

/**
 * @typedef {Object} AuthUser
 * @property {string} mobile
 * @property {string} name
 * @property {string} role     - Matches a key from ROLES enum
 * @property {string} initials
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {AuthUser|null} currentUser
 * @property {boolean}       isAuthenticated
 * @property {(mobile: string, password: string) => Promise<{success: boolean, error?: string}>} signIn
 * @property {() => Promise<void>} signOut
 * @property {(currentPwd: string, newPwd: string) => Promise<{success: boolean, error?: string}>} changePassword
 */

const AuthContext = createContext(/** @type {AuthContextValue} */ (null));

/** Read the persisted user from sessionStorage (tab-scoped).
 *  Also handles new-tab impersonation: if a fresh PENDING_IMPERSONATE_KEY
 *  token exists in localStorage it is consumed and used to bootstrap
 *  the impersonated session in this new tab.
 */
function readPersistedUser() {
  try {
    // ── New-tab impersonation handshake ─────────────────────────────
    const pendingRaw = localStorage.getItem(PENDING_IMPERSONATE_KEY);
    if (pendingRaw) {
      const { user, realUser, token, ts } = JSON.parse(pendingRaw);
      localStorage.removeItem(PENDING_IMPERSONATE_KEY); // consume immediately
      if (user && realUser && Date.now() - ts < PENDING_IMP_TTL) {
        if (token) storeToken(token); // copy the manager's JWT into this tab's sessionStorage
        const impUser = { ...user, _impersonating: true };
        sessionStorage.setItem(USER_KEY,      JSON.stringify(impUser));
        sessionStorage.setItem(REAL_USER_KEY, JSON.stringify(realUser));
        return impUser;
      }
    }
    // ── Normal tab-local session ─────────────────────────────────────
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[AuthContext] Failed to restore session:', err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate    = useNavigate();
  const [currentUser, setCurrentUser] = useState(readPersistedUser);

  // ── Listen for 401 auto-logout events dispatched by api.js ──────────
  useEffect(() => {
    function handleApiLogout() {
      sessionStorage.removeItem(USER_KEY);
      setCurrentUser(null);
      navigate(ROUTES.LOGIN, { replace: true });
    }
    window.addEventListener('auth:logout', handleApiLogout);
    return () => window.removeEventListener('auth:logout', handleApiLogout);
  }, [navigate]);

  /**
   * Sign in — delegates credential validation and token storage to authService.
   * Returns { success, error? } so callers get a consistent result shape.
   */
  const signIn = useCallback(async (mobile, password) => {
    try {
      const { user } = await authService.signIn(mobile, password);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message ?? 'Login failed.' };
    }
  }, []);

  /** Sign out — delegates token cleanup to authService. */
  const signOut = useCallback(async () => {
    await authService.signOut();
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(REAL_USER_KEY);
    setCurrentUser(null);
  }, []);

  /**
   * Change the current user's password.
   * Returns { success, error? } consistent with signIn shape.
   */
  const changePassword = useCallback(async (currentPwd, newPwd) => {
    try {
      if (!currentUser) throw new Error('Not authenticated.');
      if (currentUser._impersonating) throw new Error('Cannot change password while viewing as another user.');
      await authService.changePassword(currentUser.mobile, currentPwd, newPwd);
      // Mark isDefaultPassword as false in persisted session
      const updated = { ...currentUser, isDefaultPassword: false };
      sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
      setCurrentUser(updated);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message ?? 'Password change failed.' };
    }
  }, [currentUser]);

  /**
   * Impersonate a lower-level user (manager only).
   * Saves the real manager session under REAL_USER_KEY so exitImpersonation can restore it.
   */
  const impersonateUser = useCallback((targetUser) => {
    if (currentUser?.role !== 'manager') return;
    if (!targetUser || targetUser.role === 'manager') return;
    sessionStorage.setItem(REAL_USER_KEY, JSON.stringify(currentUser));
    const impUser = { ...targetUser, _impersonating: true };
    sessionStorage.setItem(USER_KEY, JSON.stringify(impUser));
    setCurrentUser(impUser);
  }, [currentUser]);

  /** Exit impersonation and restore the real manager session. */
  const exitImpersonation = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(REAL_USER_KEY);
      if (!raw) return;
      sessionStorage.setItem(USER_KEY, raw);
      sessionStorage.removeItem(REAL_USER_KEY);
      setCurrentUser(JSON.parse(raw));
    } catch (err) {
      console.error('[AuthContext] Failed to exit impersonation:', err);
      sessionStorage.removeItem(REAL_USER_KEY);
    }
  }, []);

  const isImpersonating = Boolean(currentUser?._impersonating);

  const value = useMemo(
    () => ({ currentUser, isAuthenticated: Boolean(currentUser), signIn, signOut, changePassword, impersonateUser, exitImpersonation, isImpersonating }),
    [currentUser, signIn, signOut, changePassword, impersonateUser, exitImpersonation, isImpersonating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
