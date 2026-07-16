/**
 * dashboardService.js — Dashboard KPI + activity data.
 * @module dashboardService
 */

import { apiFetch } from '@services/api';

export async function getDashboardStats() {
  return apiFetch('/dashboard/stats');
}

export async function getPlanComponentSummary() {
  return apiFetch('/dashboard/plan-components');
}

export async function getActivityFeed(limit = 20) {
  return apiFetch(`/dashboard/activity?limit=${limit}`);
}

export async function getLeadershipStats() {
  return apiFetch('/dashboard/leadership');
}

export async function getRepPerformance() {
  return apiFetch('/dashboard/rep-performance');
}

export async function getAllActivity(limit = 50) {
  return apiFetch(`/dashboard/all-activity?limit=${limit}`);
}

/**
 * Backup run history. Returns [] until a real backup process exists to
 * populate system_backups — no automation is wired up yet.
 */
export async function getSystemBackups(limit = 50) {
  return apiFetch(`/admin/backups?limit=${limit}`);
}
