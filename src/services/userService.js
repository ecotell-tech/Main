import { apiFetch } from '@services/api';

export async function getUsers({ role } = {}) {
  const params = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiFetch(`/admin/users${params}`);
}

export async function createUser(payload) {
  return apiFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id, payload) {
  return apiFetch(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function toggleUserStatus(id) {
  return apiFetch(`/admin/users/${id}/status`, { method: 'PATCH' });
}
