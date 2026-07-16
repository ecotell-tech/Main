/**
 * permissionService.js — Role↔permission access control.
 * `getMyPermissions` is available to any authenticated user (own role only).
 * `getPermissionMatrix`/`updatePermissionMatrix` require the `manage_roles`
 * permission and drive the real `role_permissions` table — changes take
 * effect immediately for every user of the affected role.
 */
import { apiFetch } from '@services/api';

/** @returns {Promise<string[]>} permission keys granted to the current user's role */
export async function getMyPermissions() {
  const data = await apiFetch('/auth/permissions');
  return data.permissions;
}

/** @returns {Promise<{ permissions: {key:string,label:string,module:string}[], roles: Record<string,string[]> }>} */
export async function getPermissionMatrix() {
  return apiFetch('/admin/permissions');
}

/**
 * @param {Record<string, string[]>} rolesPayload - role name -> desired permission keys
 * @returns {Promise<{ permissions: object[], roles: Record<string,string[]> }>}
 */
export async function updatePermissionMatrix(rolesPayload) {
  return apiFetch('/admin/permissions', {
    method: 'PUT',
    body: JSON.stringify({ roles: rolesPayload }),
  });
}
