import { useAuth }    from '@context/AuthContext';
import { getTheme }  from '@constants/roleTheme';

/**
 * useRoleTheme — Returns the visual theme config for the current user's role.
 * @returns {import('@constants/roleTheme').RoleThemeEntry}
 */
export function useRoleTheme() {
  const { currentUser } = useAuth();
  return getTheme(currentUser?.role);
}
