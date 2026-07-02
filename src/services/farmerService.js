/**
 * farmerService.js — All farmer-related data operations.
 * Wired to the real backend API.
 *
 * @module farmerService
 */

import { apiFetch, getToken } from '@services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// ── Response normalizer ──────────────────────────────────────────────
// Maps snake_case API fields to the camelCase shape the UI components expect.
function normalizeFarmer(f) {
  const adoptionScore  = f.adoption_score  ?? 0;
  const planStatus     = f.plan_status     ?? 'pending';
  const landAcres      = f.land_acres      != null ? parseFloat(f.land_acres)     : 0;
  const annualIncome   = f.annual_income   != null ? parseFloat(f.annual_income)  : null;
  const gpsLat         = f.gps_lat         != null ? parseFloat(f.gps_lat)        : null;
  const gpsLng         = f.gps_lng         != null ? parseFloat(f.gps_lng)        : null;

  return {
    ...f,
    // camelCase aliases for UI components
    adoptionScore,
    planStatus,
    landAcres,
    farmingType:     f.farming_type     ?? 'chemical',
    lastVisit:       f.last_visit_date  ?? '—',
    nextVisit:       f.next_visit_date  ?? '—',
    avatarGradient:  f.avatar_gradient  ?? 'linear-gradient(135deg,#6b7280,#9ca3af)',
    educationLevel:  f.education_level,
    soilType:        f.soil_type        ?? '—',
    waterSource:     f.water_source     ?? '—',
    familyMembers:   f.family_members,
    annualIncome,
    gpsLat,
    gpsLng,
    submissionNotes: f.submission_notes,
    // Geography names (from backend JOIN)
    village:         f.village_name     ?? '—',
    taluka:          f.taluka_name      ?? '—',
    district:        f.district_name    ?? '—',
    state:           f.state_name       ?? '—',
    // Crop (primary crop from farmer_crops join) + full crops list from FarmerDetail
    crop:            f.primary_crop     ?? '—',
    crops:           Array.isArray(f.crops) ? f.crops : (f.primary_crop ? [f.primary_crop] : []),
    // Personal extras
    altMobile:           f.alt_mobile            ?? null,
    gender:              f.gender                ?? null,
    dob:                 f.dob                   ?? null,
    age:                 f.age                   ?? null,
    // Location extras
    pinCode:             f.pin_code              ?? null,
    nearestMandi:        f.nearest_mandi         ?? null,
    // Farm extras
    irrigatedLandAcres:  f.irrigated_land_acres  != null ? parseFloat(f.irrigated_land_acres)       : null,
    nonIrrigatedLandAcres: f.non_irrigated_land_acres != null ? parseFloat(f.non_irrigated_land_acres) : null,
    landOwnership:       f.land_ownership        ?? null,
    annualYieldQuintals: f.annual_yield_quintals != null ? parseFloat(f.annual_yield_quintals) : null,
    practiceNotes:       f.practice_notes        ?? null,
    // Readiness
    interestLevel:       f.interest_level        ?? null,
    trainingWillingness: f.training_willingness  ?? null,
    adoptionTimeline:    f.adoption_timeline     ?? null,
    attendedTraining:    f.attended_training     ?? 0,
    // Engagement
    consultNotes:        f.consult_notes         ?? null,
    followupDate:        f.followup_date         ?? null,
    priority:            f.priority              ?? null,
    nextAction:          f.next_action           ?? null,
    referredBy:          f.referred_by           ?? null,
    // Plan components — not in summary; default to empty
    components:      f.components       ?? {},
    // Representative info
    repName:         f.rep_name         ?? '—',
    repMobile:       f.rep_mobile       ?? '—',
    repEmail:        '—',
    repId:           f.registered_by_user_id ?? null,
    submittedByRole: f.submitted_by_role ?? '—',
    // Review workflow
    reviewStatus:    f.review_status    ?? 'pending_review',
    rejectionReason: f.rejection_reason ?? null,
    // Audit trail
    registeredBy:    f.rep_name         ?? '—',
    registrationDate: f.created_at
      ? new Date(f.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
      : '—',
    surveyDate:      f.survey_date   ?? '—',
    approvedBy:      '—',
    approvedDate:    f.approved_date ?? '—',
    // Sensitive masked fields
    aadhaar:         f.aadhaar_masked       ?? '—',
    bankAccount:     f.bank_account_masked  ?? '—',
    // Photos — present only on FarmerDetail (GET /farmers/:id)
    farmPhotos: (f.farm_photos ?? []).map(p => ({
      id:      p.id,
      tag:     p.photo_type,
      caption: p.caption ?? p.photo_type,
      url:     p.file_path ? `${API_BASE}/uploads/${p.file_path}` : null,
      date:    p.created_at
        ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    })),
  };
}

/**
 * Fetch the paginated list of farmers.
 * @param {{ page?: number, limit?: number, search?: string, plan_status?: string }} [opts]
 * @returns {Promise<{ farmers: object[], total: number, page: number, pages: number }>}
 */
export async function getFarmers({ page = 1, limit = 100, search, plan_status } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search)      params.set('search',      search);
  if (plan_status) params.set('plan_status', plan_status);

  const data = await apiFetch(`/farmers?${params}`);
  return {
    ...data,
    farmers: data.farmers.map(normalizeFarmer),
  };
}

/**
 * Fetch a single farmer by ID.
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getFarmerById(id) {
  try {
    const data = await apiFetch(`/farmers/${id}`);
    return normalizeFarmer(data);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Create a new farmer record.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createFarmer(payload) {
  const data = await apiFetch('/farmers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeFarmer(data);
}

/**
 * Update an existing farmer.
 * @param {string|number} id
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function updateFarmer(id, payload) {
  const data = await apiFetch(`/farmers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeFarmer(data);
}

/**
 * Check whether a mobile number is already registered.
 * @param {string} mobile
 * @returns {Promise<boolean>}
 */
export async function checkMobileDuplicate(mobile) {
  const data = await apiFetch(`/farmers/check-mobile?mobile=${encodeURIComponent(mobile)}`);
  return data.duplicate;
}

/**
 * Bulk-import farmers from parsed Excel/CSV upload.
 * @param {object[]} farmers
 * @returns {Promise<{ imported: number, ids: string[] }>}
 */
export async function importFarmers(farmers) {
  return apiFetch('/farmers/bulk', {
    method: 'POST',
    body: JSON.stringify({ farmers }),
  });
}

/**
 * Mark a draft farmer as fully registered (is_draft → false).
 * Called at the final wizard step after all data and photos are saved.
 * @param {string|number} id
 * @returns {Promise<object>}
 */
export async function completeFarmerRegistration(id) {
  const data = await apiFetch(`/farmers/${id}/complete`, { method: 'PUT' });
  return normalizeFarmer(data);
}

/**
 * Fetch the current user's in-progress draft registrations.
 * @param {{ page?: number, limit?: number }} [opts]
 * @returns {Promise<{ farmers: object[], total: number, page: number, pages: number }>}
 */
export async function getDraftFarmers({ page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ page, limit });
  const data = await apiFetch(`/farmers/drafts?${params}`);
  return {
    ...data,
    farmers: data.farmers.map(normalizeFarmer),
  };
}

/**
 * Replace all crops for a farmer (by crop names).
 * @param {number} id
 * @param {string[]} cropNames
 * @returns {Promise<object>}
 */
export async function setFarmerCrops(id, cropNames) {
  const data = await apiFetch(`/farmers/${id}/crops`, {
    method: 'PUT',
    body: JSON.stringify({ crop_names: cropNames }),
  });
  return normalizeFarmer(data);
}

/**
 * Upload up to 5 farm photos for a farmer.
 * Uses raw fetch (not apiFetch) so Content-Type is set automatically
 * by the browser as multipart/form-data with the correct boundary.
 *
 * @param {string|number} farmerId
 * @param {{ farmer?: File, land?: File, well?: File, soil?: File, house?: File }} photos
 * @returns {Promise<{ saved: string[], farmer_id: number }>}
 */
export async function uploadFarmerPhotos(farmerId, photos) {
  const fd = new FormData();
  let hasFiles = false;

  for (const key of ['farmer', 'land', 'well', 'soil', 'house']) {
    if (photos[key] instanceof File) {
      fd.append(`photo_${key}`, photos[key]);
      hasFiles = true;
    }
  }

  if (!hasFiles) return { saved: [], farmer_id: farmerId };

  const token = getToken();
  const res = await fetch(`${API_BASE}/farmers/${farmerId}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(msg || `Photo upload failed (${res.status})`);
  }
  return res.json();
}

/**
 * Team lead rejects a farmer registration record.
 * @param {string|number} farmerId
 * @param {string|null} reason  Optional rejection note for the representative.
 * @returns {Promise<object>}   Updated farmer detail.
 */
export async function rejectFarmer(farmerId, reason) {
  return apiFetch(`/farmers/${farmerId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason: reason || null }),
  });
}

// ── Geography helpers ────────────────────────────────────────────────

export async function getGeoStates() {
  return apiFetch('/geography/states');
}

export async function getGeoDistricts(stateId) {
  return apiFetch(`/geography/districts?state_id=${stateId}`);
}

export async function getGeoTalukas(districtId) {
  return apiFetch(`/geography/talukas?district_id=${districtId}`);
}

export async function getGeoVillages(talukaId) {
  return apiFetch(`/geography/villages?taluka_id=${talukaId}`);
}

/**
 * Return full hierarchy for one village: village → taluka → district → state (with all IDs).
 * Used by the registration form's resume-draft feature.
 * @param {number} villageId
 */
export async function getVillageContext(villageId) {
  return apiFetch(`/geography/village/${villageId}`);
}
