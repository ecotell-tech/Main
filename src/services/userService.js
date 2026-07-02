import { apiFetch } from '@services/api';

export async function getUsers() {
  return apiFetch('/admin/users');
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
