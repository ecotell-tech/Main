import { apiFetch } from '@services/api';

function normalizeVisit(v) {
  const rawDate = v.visited_date ?? v.scheduled_date;
  const date = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  return {
    id:       v.id,
    code:     v.visit_code,
    farmerId: v.farmer_id,
    farmer:   v.farmer_name ?? '—',
    type:     v.visit_type_name ?? '—',
    date,
    status:   v.status ?? 'scheduled',
    location: v.location ?? '—',
    notes:    v.notes ?? '',
  };
}

/**
 * Fetch paginated visit logs for the current user.
 * @param {{ page?: number, limit?: number, farmer_id?: number, status?: string }} opts
 * @returns {Promise<object[]>}
 */
export async function getVisits({ page = 1, limit = 100, farmer_id, status } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (farmer_id) params.set('farmer_id', farmer_id);
  if (status)    params.set('status',    status);
  const data = await apiFetch(`/visits?${params}`);
  return data.visits.map(normalizeVisit);
}

/**
 * Fetch the master list of visit type categories.
 * @returns {Promise<{ id: number, name: string }[]>}
 */
export async function getVisitTypes() {
  return apiFetch('/visits/types');
}

/**
 * Fetch a single visit with full detail (notes, conducted_by).
 * @param {number} id
 */
export async function getVisitById(id) {
  const v = await apiFetch(`/visits/${id}`);
  const rawDate = v.visited_date ?? v.scheduled_date;
  const date = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  return {
    id:           v.id,
    code:         v.visit_code,
    farmerId:     v.farmer_id,
    farmer:       v.farmer_name       ?? '—',
    type:         v.visit_type_name   ?? '—',
    date,
    status:       v.status            ?? 'scheduled',
    location:     v.location          ?? '—',
    notes:        v.notes             ?? '',
    conductedBy:  v.conducted_by_name ?? '—',
  };
}

/**
 * Create a new visit log entry.
 * @param {{ farmer_id: number, visit_type_id: number, scheduled_date?: string, notes?: string, location?: string }} payload
 * @returns {Promise<object>}
 */
export async function createVisit(payload) {
  return apiFetch('/visits', { method: 'POST', body: JSON.stringify(payload) });
}
