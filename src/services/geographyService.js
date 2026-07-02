import { apiFetch } from '@services/api';

export async function fetchStates() {
  return apiFetch('/geography/states');
}

export async function fetchDistricts(stateId) {
  return apiFetch(`/geography/districts?state_id=${stateId}`);
}

export async function fetchTalukas(districtId) {
  return apiFetch(`/geography/talukas?district_id=${districtId}`);
}

export async function fetchVillages(talukaId) {
  return apiFetch(`/geography/villages?taluka_id=${talukaId}`);
}

export async function fetchVillageContext(villageId) {
  return apiFetch(`/geography/village/${villageId}`);
}

export async function createState(name, code) {
  return apiFetch('/geography/states', {
    method: 'POST',
    body: JSON.stringify({ name, code: code || null }),
  });
}

export async function createDistrict(stateId, name) {
  return apiFetch('/geography/districts', {
    method: 'POST',
    body: JSON.stringify({ state_id: stateId, name }),
  });
}

export async function createTaluka(districtId, name) {
  return apiFetch('/geography/talukas', {
    method: 'POST',
    body: JSON.stringify({ district_id: districtId, name }),
  });
}

export async function createVillage(talukaId, name, pinCode) {
  return apiFetch('/geography/villages', {
    method: 'POST',
    body: JSON.stringify({ taluka_id: talukaId, name, pin_code: pinCode || null }),
  });
}
