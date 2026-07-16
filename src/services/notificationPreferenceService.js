/**
 * notificationPreferenceService.js — Per-user notification toggle preferences.
 */
import { apiFetch } from '@services/api';

/** @returns {Promise<{visitReminders: boolean, planUpdates: boolean, newAssignments: boolean}>} */
export async function getNotificationPreferences() {
  return apiFetch('/settings/notifications');
}

/** @param {{visitReminders?: boolean, planUpdates?: boolean, newAssignments?: boolean}} patch */
export async function updateNotificationPreferences(patch) {
  return apiFetch('/settings/notifications', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
