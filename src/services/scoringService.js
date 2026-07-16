import { apiFetch } from '@services/api';

/**
 * Fetch the 5 adoption-scoring factors with their weights and options.
 * Note: this config is not yet wired into the actual farmer adoption_score
 * calculation (a separate formula) — see backend/app/services/farmer_service.py.
 */
export async function getScoringFactors() {
  const data = await apiFetch('/admin/scoring');
  return data.map((f) => ({
    id:          f.id,
    code:        f.code,
    label:       f.label,
    description: f.description,
    icon:        f.icon_class,
    color:       f.color,
    weight:      f.weight,
    isActive:    f.is_active,
    options:     (f.options ?? []).map((o) => ({ id: o.id, label: o.label, score: o.score_points })),
  }));
}

/** @param {{id: number, weight: number}[]} factors */
export async function updateScoringWeights(factors) {
  return apiFetch('/admin/scoring', {
    method: 'PUT',
    body: JSON.stringify({ factors: factors.map((f) => ({ id: f.id, weight: f.weight })) }),
  });
}
