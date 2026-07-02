/**
 * formConfigDefaults.js
 *
 * Static defaults for every configurable item in the Farmer Registration form.
 * These values are used when no Leadership override has been saved.
 *
 * Structure of each option:  { value: string, label: string, active: boolean }
 * When value === label, we store only value (label falls back to value at runtime).
 */

function opts(values) {
  return values.map((v) =>
    typeof v === 'string'
      ? { value: v, label: v, active: true }
      : { value: v.value, label: v.label ?? v.value, active: true }
  );
}

// ── Dropdown option defaults ─────────────────────────────────────────────────

export const DEFAULT_DROPDOWNS = Object.freeze({
  // Step 1 — Identity
  gender: opts(['Male', 'Female', 'Other']),
  education: opts(['Illiterate', 'Primary', 'Secondary', 'HSC', 'Graduate', 'Post Graduate']),

  // Step 3 — Farm
  soilType: opts([
    'Black Cotton Soil', 'Red Soil', 'Sandy Loam',
    'Alluvial', 'Laterite', 'Mixed',
  ]),
  waterSource: opts([
    'Borewell', 'Open Well', 'Canal', 'River', 'Rainwater only', 'Mixed',
  ]),
  ownership: opts(['Own', 'Leased', 'Shared / Bagayat', 'Family Owned']),
  irrigationInfra: opts(['Drip System', 'Sprinkler', 'Pump Set', 'None']),

  // Step 4 — Crops
  crops: opts([
    'Cotton', 'Wheat', 'Rice', 'Groundnut', 'Banana',
    'Sugarcane', 'Vegetables', 'Maize', 'Soybean', 'Bajra',
    'Jowar', 'Castor', 'Turmeric', 'Chilli', 'Onion',
  ]),
  season: opts([
    'Kharif only', 'Rabi only', 'Kharif + Rabi', 'Year-round', 'Zaid + Kharif',
  ]),

  // Step 5 — Practice
  farmMethod: opts([
    { value: 'Chemical', label: 'Chemical' },
    { value: 'Organic',  label: 'Organic'  },
    { value: 'Natural',  label: 'Natural / Zero-budget' },
    { value: 'Mixed',    label: 'Mixed'    },
  ]),
  inputs: opts([
    'Chemical Fertilizer', 'Pesticides', 'Bio-fertilizer',
    'Compost / FYM', 'Jeevamrut', 'Neem Products',
  ]),
  challenges: opts([
    'Pest/Disease', 'Water Scarcity', 'Soil Degradation',
    'Market Access', 'Finance', 'Labour Shortage', 'Climate Risk',
  ]),

  // Step 6 — Readiness
  awareness: opts([
    'PM-KUSUM', 'PKVY', 'NHM', 'MGNREGS', 'FPO Membership', 'None',
  ]),
  training: opts([
    'No training needed', 'Basic awareness', 'Hands-on demo',
    'Full training program', 'Exposure visit',
  ]),
  timeline: opts([
    'Immediate (1 season)', '6–12 months', '1–2 years', '2–3 years', 'Not decided',
  ]),

  // Step 7 — Engage
  appointment: opts([
    'Scheduled', 'Pending Confirmation', 'Follow-up Required', 'Initial Visit Done',
  ]),
  priority: opts(['High', 'Medium', 'Low']),
});

// Human-readable metadata for each dropdown key ──────────────────────────────
export const DROPDOWN_META = Object.freeze({
  gender:         { label: 'Gender',                   step: 'identity',  icon: 'fas fa-venus-mars'      },
  education:      { label: 'Education Level',          step: 'identity',  icon: 'fas fa-graduation-cap'  },
  soilType:       { label: 'Soil Type',                step: 'farm',      icon: 'fas fa-layer-group'     },
  waterSource:    { label: 'Primary Water Source',     step: 'farm',      icon: 'fas fa-water'           },
  ownership:      { label: 'Land Ownership',           step: 'farm',      icon: 'fas fa-file-contract'   },
  irrigationInfra:{ label: 'Irrigation Infrastructure',step: 'farm',      icon: 'fas fa-faucet'          },
  crops:          { label: 'Crop Options',             step: 'crops',     icon: 'fas fa-seedling'        },
  season:         { label: 'Seasonal Pattern',         step: 'crops',     icon: 'fas fa-sun'             },
  farmMethod:     { label: 'Farming Method',           step: 'practice',  icon: 'fas fa-flask'           },
  inputs:         { label: 'Inputs Used',              step: 'practice',  icon: 'fas fa-box'             },
  challenges:     { label: 'Challenges Faced',         step: 'practice',  icon: 'fas fa-exclamation-triangle' },
  awareness:      { label: 'Government Schemes',       step: 'readiness', icon: 'fas fa-landmark'        },
  training:       { label: 'Training Requirement',     step: 'readiness', icon: 'fas fa-chalkboard'      },
  timeline:       { label: 'Conversion Timeline',      step: 'readiness', icon: 'fas fa-clock'           },
  appointment:    { label: 'Appointment Status',       step: 'engage',    icon: 'fas fa-calendar-check'  },
  priority:       { label: 'Priority Level',           step: 'engage',    icon: 'fas fa-flag'            },
});

// Wizard step definitions ─────────────────────────────────────────────────────
export const DEFAULT_STEPS = Object.freeze([
  { id: 'identity',  label: 'Identity',  icon: 'fas fa-id-card',        enabled: true, locked: true,  order: 0 },
  { id: 'location',  label: 'Location',  icon: 'fas fa-map-marker-alt', enabled: true, locked: false, order: 1 },
  { id: 'farm',      label: 'Farm',      icon: 'fas fa-tractor',        enabled: true, locked: false, order: 2 },
  { id: 'crops',     label: 'Crops',     icon: 'fas fa-seedling',       enabled: true, locked: false, order: 3 },
  { id: 'practice',  label: 'Practice',  icon: 'fas fa-flask',          enabled: true, locked: false, order: 4 },
  { id: 'readiness', label: 'Readiness', icon: 'fas fa-chart-line',     enabled: true, locked: false, order: 5 },
  { id: 'engage',    label: 'Engage',    icon: 'fas fa-handshake',      enabled: true, locked: false, order: 6 },
  { id: 'photos',    label: 'Photos',    icon: 'fas fa-camera',         enabled: true, locked: false, order: 7 },
  { id: 'review',    label: 'Review',    icon: 'fas fa-check',          enabled: true, locked: true,  order: 8 },
]);

// Steps that can have extended fields injected into them ──────────────────────
export const EXTENDABLE_STEP_IDS = [
  'identity', 'location', 'farm', 'crops', 'practice', 'readiness', 'engage',
];

// Extended field type registry ────────────────────────────────────────────────
export const FIELD_TYPES = Object.freeze([
  { value: 'text',        label: 'Text Input',      icon: 'fas fa-font'           },
  { value: 'number',      label: 'Number',          icon: 'fas fa-hashtag'        },
  { value: 'textarea',    label: 'Textarea',        icon: 'fas fa-align-left'     },
  { value: 'date',        label: 'Date Picker',     icon: 'fas fa-calendar-alt'   },
  { value: 'select',      label: 'Dropdown (single)',icon: 'fas fa-caret-square-down' },
  { value: 'toggle',      label: 'Toggle (single)', icon: 'fas fa-dot-circle'     },
  { value: 'multiselect', label: 'Multi-select',    icon: 'fas fa-check-square'   },
  { value: 'checkbox',    label: 'Yes / No',        icon: 'fas fa-toggle-on'      },
]);

// Default: no extended fields
export const DEFAULT_EXTENDED_FIELDS = Object.freeze([]);
