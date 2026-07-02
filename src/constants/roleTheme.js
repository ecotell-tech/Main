/**
 * roleTheme.js — Per-role visual identity config.
 *
 * Each role has a distinct color palette applied to:
 *   • Sidebar gradient background
 *   • Dashboard hero banner
 *   • Stat card accent borders
 *   • Role badge in AppHeader
 *
 * Hierarchy (top → bottom):
 *   Leadership (manager)     → Navy  (#12305e)  — Authority, strategy
 *   Manager (admin)          → Purple (#7c3aed) — Management, oversight
 *   Team Lead (team_lead)    → Blue  (#2563eb)  — Team coordination
 *   Agronomist               → Green (#16a34a)  — Nature, field work
 *   Data Entry Operator      → Teal  (#0d9488)  — Operations, precision
 */

export const ROLE_THEME = Object.freeze({
  agronomist: {
    label:         'Farmer Representative',
    icon:          'fas fa-seedling',
    sidebarFrom:   '#134e3a',
    sidebarTo:     '#16a34a',
    bannerFrom:    '#14532d',
    bannerTo:      '#16a34a',
    accent:        '#16a34a',
    accentLight:   '#dcfce7',
    accentText:    '#14532d',
    badgeCls:      'bg-green-100 text-green-800 ring-1 ring-green-500/30',
    textCls:       'text-green-700',
    borderCls:     'border-green-500',
    bgLightCls:    'bg-green-50',
    statVariant:   'green',
  },

  team_lead: {
    label:         'Team Lead',
    icon:          'fas fa-users-between-lines',
    sidebarFrom:   '#1e3a8a',
    sidebarTo:     '#2563eb',
    bannerFrom:    '#1e3a8a',
    bannerTo:      '#3b82f6',
    accent:        '#2563eb',
    accentLight:   '#dbeafe',
    accentText:    '#1e3a8a',
    badgeCls:      'bg-blue-100 text-blue-800 ring-1 ring-blue-500/30',
    textCls:       'text-blue-700',
    borderCls:     'border-blue-500',
    bgLightCls:    'bg-blue-50',
    statVariant:   'blue',
  },

  admin: {
    label:         'Manager',
    icon:          'fas fa-user-shield',
    sidebarFrom:   '#3b0764',
    sidebarTo:     '#7c3aed',
    bannerFrom:    '#3b0764',
    bannerTo:      '#8b5cf6',
    accent:        '#7c3aed',
    accentLight:   '#ede9fe',
    accentText:    '#4c1d95',
    badgeCls:      'bg-violet-100 text-violet-800 ring-1 ring-violet-500/30',
    textCls:       'text-violet-700',
    borderCls:     'border-violet-500',
    bgLightCls:    'bg-violet-50',
    statVariant:   'blue',
  },

  data_entry_operator: {
    label:         'Data Entry Operator',
    icon:          'fas fa-keyboard',
    sidebarFrom:   '#134e4a',
    sidebarTo:     '#0d9488',
    bannerFrom:    '#134e4a',
    bannerTo:      '#14b8a6',
    accent:        '#0d9488',
    accentLight:   '#ccfbf1',
    accentText:    '#134e4a',
    badgeCls:      'bg-teal-100 text-teal-800 ring-1 ring-teal-500/30',
    textCls:       'text-teal-700',
    borderCls:     'border-teal-500',
    bgLightCls:    'bg-teal-50',
    statVariant:   'green',
  },

  manager: {
    label:         'Leadership',
    icon:          'fas fa-chess-king',
    sidebarFrom:   '#0a1628',
    sidebarTo:     '#12305e',
    bannerFrom:    '#0a1628',
    bannerTo:      '#1a4080',
    accent:        '#3b82f6',
    accentLight:   '#eff6ff',
    accentText:    '#1e3a8a',
    badgeCls:      'bg-blue-950 text-blue-100 ring-1 ring-blue-700/40',
    textCls:       'text-blue-900',
    borderCls:     'border-blue-800',
    bgLightCls:    'bg-blue-50',
    statVariant:   'blue',
  },
});

/**
 * Returns the theme for a given role string, falling back to agronomist.
 * Handles the legacy 'supervisor' slug transparently.
 * @param {string} role
 */
export function getTheme(role) {
  // Normalize legacy slug
  const key = role === 'supervisor' ? 'team_lead' : role;
  return ROLE_THEME[key] ?? ROLE_THEME.agronomist;
}
