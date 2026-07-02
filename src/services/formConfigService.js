import { apiFetch } from '@services/api';

/**
 * Fetch the full form template for the current user.
 *
 * Returns an object with:
 *   configured_by_name    {string}  — team lead who saved this config
 *   configured_by_user_id {number}  — their user ID
 *   dropdowns             {object}  — all dropdown option lists
 *   extended_fields       {array}   — Leadership-defined custom field defs
 *   steps                 {array}   — wizard step enable/disable/rename
 *   module_access         {object}  — routePath → allowed roles
 *   updated_at            {string}  — ISO timestamp of last change
 *
 * For agronomists this automatically returns their manager's template.
 * For managers it returns their own template (or the global default if
 * they haven't saved anything yet).
 */
export async function fetchFormTemplate() {
  return apiFetch('/form-config');
}

/**
 * Save one configuration section to the caller's template row in the DB.
 *
 * @param {'dropdowns'|'extendedFields'|'steps'|'moduleAccess'} section
 * @param {*} valueJson  - The full JSON for that section
 * @returns {Promise<FormTemplateOut>} - Updated template row
 */
export async function saveSectionToTemplate(section, valueJson) {
  return apiFetch(`/form-config/${section}`, {
    method: 'PUT',
    body: JSON.stringify({ value_json: valueJson }),
  });
}
