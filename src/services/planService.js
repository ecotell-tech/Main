/**
 * planService.js — Post-conversion consulting plans (M15).
 * Wraps GET/POST/PUT /plans against the real backend.
 */
import { apiFetch } from '@services/api';

function normalizeComponent(c) {
  return {
    id:              c.id,
    componentTypeId: c.component_type_id,
    code:            c.component_code,
    label:           c.component_label,
    status:          c.status,       // pending | active | done | skipped
    completedAt:     c.completed_at,
    notes:           c.notes,
  };
}

function normalizePlan(p) {
  return {
    id:               p.id,
    planCode:         p.plan_code,
    farmerId:         p.farmer_id,
    farmerName:       p.farmer_name,
    consultantUserId: p.consultant_user_id,
    consultantName:   p.consultant_name,
    status:           p.status,
    overallStatus:    p.overall_status,   // not_started | plan_created | in_progress | completed
    startDate:        p.start_date,
    endDate:          p.end_date,
    createdAt:        p.created_at,
    createdByUserId:  p.created_by_user_id,
    approvedByUserId: p.approved_by_user_id,
    notes:            p.notes,
    components:       Array.isArray(p.components) ? p.components.map(normalizeComponent) : undefined,
  };
}

/**
 * Fetch consulting plans, optionally filtered.
 * @param {{ farmerId?: number, status?: string, limit?: number }} [opts]
 */
export async function getPlans({ farmerId, status, limit = 500 } = {}) {
  const params = new URLSearchParams({ page: 1, limit });
  if (farmerId) params.set('farmer_id', farmerId);
  if (status)   params.set('status', status);
  const data = await apiFetch(`/plans?${params}`);
  return { ...data, plans: data.plans.map(normalizePlan) };
}

export async function getPlan(id) {
  const data = await apiFetch(`/plans/${id}`);
  return normalizePlan(data);
}

/**
 * @param {{ farmerId: number, consultantUserId?: number, notes?: string, startDate?: string, endDate?: string }} payload
 */
export async function createPlan({ farmerId, consultantUserId, notes, startDate, endDate }) {
  const data = await apiFetch('/plans', {
    method: 'POST',
    body: JSON.stringify({
      farmer_id:          farmerId,
      consultant_user_id: consultantUserId || null,
      notes:              notes || null,
      start_date:         startDate || null,
      end_date:           endDate || null,
    }),
  });
  return normalizePlan(data);
}

/**
 * @param {number} id
 * @param {{ consultantUserId?: number, status?: string, overallStatus?: string, notes?: string, startDate?: string, endDate?: string }} patch
 */
export async function updatePlan(id, patch) {
  const body = {};
  if (patch.consultantUserId !== undefined) body.consultant_user_id = patch.consultantUserId;
  if (patch.status           !== undefined) body.status             = patch.status;
  if (patch.overallStatus    !== undefined) body.overall_status      = patch.overallStatus;
  if (patch.notes            !== undefined) body.notes               = patch.notes;
  if (patch.startDate        !== undefined) body.start_date          = patch.startDate;
  if (patch.endDate          !== undefined) body.end_date            = patch.endDate;

  const data = await apiFetch(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  return normalizePlan(data);
}

/** @param {'pending'|'active'|'done'|'skipped'} status */
export async function updatePlanComponent(planId, componentTypeId, status, notes) {
  const data = await apiFetch(`/plans/${planId}/components/${componentTypeId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes: notes ?? null }),
  });
  return normalizeComponent(data);
}
