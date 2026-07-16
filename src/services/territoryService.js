import { apiFetch } from '@services/api';

/**
 * Fetch all active district → representative territory assignments.
 * @returns {Promise<{districtId: number, districtName: string, stateId: number|null, userId: number, userName: string}[]>}
 */
export async function getTerritoryAssignments() {
  const data = await apiFetch('/territory-assignments');
  return data.map((a) => ({
    districtId:   a.district_id,
    districtName: a.district_name,
    stateId:      a.state_id,
    userId:       a.user_id,
    userName:     a.user_name,
  }));
}

/** Assign a district to a representative — replaces any prior active assignee for that district. */
export async function assignDistrict(districtId, userId) {
  return apiFetch('/territory-assignments', {
    method: 'POST',
    body: JSON.stringify({ district_id: districtId, user_id: userId }),
  });
}

/** Unassign whoever currently covers this district. */
export async function unassignDistrict(districtId) {
  return apiFetch('/territory-assignments/unassign', {
    method: 'POST',
    body: JSON.stringify({ district_id: districtId }),
  });
}
