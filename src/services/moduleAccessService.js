import { apiFetch } from '@services/api';

/**
 * Fetch the module-access overrides for the current user.
 *
 * Reads the `module_access` field from the user's form template.
 * Returns a plain object mapping routePath → string[] of allowed roles,
 * or null if nothing has been saved yet.
 */
export async function fetchModuleAccess() {
  try {
    const tmpl = await apiFetch('/form-config');
    return tmpl?.module_access ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist module-access overrides to the caller's template row.
 * Requires manage_roles permission (admin / manager).
 *
 * @param {Record<string, string[]>} overridesObj - routePath → allowed role array
 */
export async function saveModuleAccess(overridesObj) {
  return apiFetch('/form-config/moduleAccess', {
    method: 'PUT',
    body: JSON.stringify({ value_json: overridesObj }),
  });
}
