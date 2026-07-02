import { apiFetch } from '@services/api';

/**
 * Fetch plan completion report rows.
 * @param {{ page?: number, limit?: number }} opts
 * @returns {Promise<{ rows: object[], total: number, page: number, pages: number }>}
 */
export async function getReportRows({ page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return apiFetch(`/reports/plan-completion?${params}`);
}

/**
 * Fetch per-rep team performance stats for the team lead report.
 * @returns {Promise<{ reps: object[], total_farmers: number, total_pending: number, total_approved: number, total_rejected: number }>}
 */
export async function getTeamPerformance() {
  return apiFetch('/reports/team-performance');
}

/**
 * Fetch the rep's top-performing farmers (approved + highest composite score).
 * @param {{ limit?: number }} opts
 * @returns {Promise<{ farmers: object[], total: number }>}
 */
export async function getTopFarmers({ limit = 10 } = {}) {
  const params = new URLSearchParams({ limit });
  return apiFetch(`/reports/top-farmers?${params}`);
}
