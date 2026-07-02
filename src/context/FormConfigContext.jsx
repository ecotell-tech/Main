/**
 * FormConfigContext.jsx — DB-backed runtime form configuration.
 *
 * Source of truth is the server (form_templates table).
 * No localStorage — all reads and writes go to the API.
 *
 * ── Load order ───────────────────────────────────────────────────────────────
 *   1. On mount the context is initialised with static defaults (instant render,
 *      no flash of empty fields).
 *   2. When the user is authenticated, GET /form-config is called.  The response
 *      replaces in-memory state with whatever the manager saved to the DB.
 *   3. If the API is unavailable the static defaults remain in use.
 *
 * ── Save flow ────────────────────────────────────────────────────────────────
 *   Setters (setAllDropdowns, setExtendedFields, setStepConfig) PUT to the API
 *   immediately and update in-memory state only after the server confirms.
 *   They return the API Promise so callers can await and surface errors.
 *
 * ── configuredBy ─────────────────────────────────────────────────────────────
 *   Exposed to consumers so the registration wizard can show
 *   "Form configured by [Team Lead Name]".
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  DEFAULT_DROPDOWNS,
  DEFAULT_STEPS,
  DEFAULT_EXTENDED_FIELDS,
} from '@constants/formConfigDefaults';
import { fetchFormTemplate, saveSectionToTemplate } from '@services/formConfigService';
import { useAuth } from '@context/AuthContext';

// ── Defaults ─────────────────────────────────────────────────────────────────
function buildDefault() {
  return {
    dropdowns:      DEFAULT_DROPDOWNS,
    steps:          DEFAULT_STEPS,
    extendedFields: DEFAULT_EXTENDED_FIELDS,
    territory:      null,
  };
}

/** Map the API template response to our internal config shape. */
function templateToConfig(tmpl) {
  const config = buildDefault();
  if (tmpl.dropdowns)       config.dropdowns      = tmpl.dropdowns;
  if (tmpl.extended_fields) config.extendedFields = tmpl.extended_fields;
  if (tmpl.steps)           config.steps          = tmpl.steps;
  if (tmpl.territory)       config.territory      = tmpl.territory;
  return config;
}

// ── Context ───────────────────────────────────────────────────────────────────
const FormConfigContext = createContext(null);

export function FormConfigProvider({ children }) {
  const { currentUser } = useAuth();
  const [config, setConfig]           = useState(buildDefault);
  const [configuredBy, setConfiguredBy] = useState('');
  // Start true so tabs wait for the API before mounting and reading context data.
  // Without this, each tab's draft initializes from static defaults and stays
  // stale even after the API loads — causing saves to overwrite real data.
  const [loading, setLoading]         = useState(true);

  // Stable ref so setters with [] deps can always read the latest config
  // without stale closure issues (needed because useCallback deps are []).
  const configRef = useRef(config);
  configRef.current = config;

  // ── Fetch from DB whenever the logged-in user changes ────────────────────
  const [fetchTick, setFetchTick] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetchFormTemplate()
      .then((tmpl) => {
        if (cancelled) return;
        setConfiguredBy(tmpl.configured_by_name || '');
        setConfig(templateToConfig(tmpl));
      })
      .catch(() => {
        // No template saved yet — keep static defaults; no error shown.
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [currentUser?.mobile, fetchTick]);

  const refetchConfig = useCallback(() => setFetchTick((t) => t + 1), []);

  // ── Internal: optimistically update state, then persist to the DB ──────────
  // `configKey`  — key on the config object to update ('dropdowns', 'steps', …)
  // `apiSection` — URL segment for the PUT   ('dropdowns', 'steps', …)
  // `newValue`   — the complete new value for that section
  //
  // The payload is passed directly to the API (not extracted from the updater)
  // so this works correctly in React 18 where functional state updaters are
  // called during the render phase, not synchronously at call time.
  //
  // On failure the optimistic update is REVERTED so the tab's isDirty check
  // can detect that the local state differs from context, keeping the Save
  // button enabled and letting the user retry.
  function applyAndSync(configKey, apiSection, newValue) {
    const prevValue = configRef.current[configKey];
    setConfig((prev) => ({ ...prev, [configKey]: newValue }));
    return saveSectionToTemplate(apiSection, newValue)
      .then((tmpl) => {
        setConfiguredBy(tmpl.configured_by_name || '');
      })
      .catch((err) => {
        setConfig((prev) => ({ ...prev, [configKey]: prevValue }));
        throw err;
      });
  }

  // ── Dropdowns ─────────────────────────────────────────────────────────────

  const getDropdownOptions = useCallback(
    (key) => (config.dropdowns[key] ?? []).filter((o) => o.active).map((o) => o.label),
    [config.dropdowns],
  );

  const getAllDropdownOptions = useCallback(
    (key) => config.dropdowns[key] ?? [],
    [config.dropdowns],
  );

  // setDropdownOptions patches one key; reads current dropdowns via configRef
  // so the useCallback([]) doesn't suffer from a stale closure.
  const setDropdownOptions = useCallback((key, options) => {
    const nextDropdowns = { ...configRef.current.dropdowns, [key]: options };
    return applyAndSync('dropdowns', 'dropdowns', nextDropdowns);
  }, []);

  const setAllDropdowns = useCallback(
    (dropdowns) => applyAndSync('dropdowns', 'dropdowns', dropdowns),
    [],
  );

  // ── Extended fields ───────────────────────────────────────────────────────

  const getFieldsForStep = useCallback(
    (stepId) =>
      (config.extendedFields ?? [])
        .filter((f) => f.step === stepId && f.active)
        .sort((a, b) => a.order - b.order),
    [config.extendedFields],
  );

  const getAllExtendedFields = useCallback(
    () => config.extendedFields ?? [],
    [config.extendedFields],
  );

  const setExtendedFields = useCallback(
    (extendedFields) => applyAndSync('extendedFields', 'extendedFields', extendedFields),
    [],
  );

  // ── Steps ─────────────────────────────────────────────────────────────────

  const getSteps = useCallback(
    () => [...(config.steps ?? DEFAULT_STEPS)].sort((a, b) => a.order - b.order),
    [config.steps],
  );

  const getEnabledSteps = useCallback(
    () => getSteps().filter((s) => s.enabled),
    [getSteps],
  );

  const setStepConfig = useCallback(
    (steps) => applyAndSync('steps', 'steps', steps),
    [],
  );

  // ── Reset to DB defaults (wipe the manager's overrides) ───────────────────
  const resetToDefaults = useCallback(() => {
    setConfig(buildDefault());
    setConfiguredBy('');
  }, []);

  const hasCustomConfig = useMemo(
    () => configuredBy !== '',
    [configuredBy],
  );

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // Dropdowns
    getDropdownOptions,
    getAllDropdownOptions,
    setDropdownOptions,
    setAllDropdowns,

    // Extended fields
    getFieldsForStep,
    getAllExtendedFields,
    setExtendedFields,

    // Steps
    getSteps,
    getEnabledSteps,
    setStepConfig,

    // Misc
    resetToDefaults,
    refetchConfig,
    hasCustomConfig,
    configuredBy,
    loading,
    territory: config.territory,

    // Raw config for FormConfigPage draft editing
    rawConfig: config,
  };

  return (
    <FormConfigContext.Provider value={value}>
      {children}
    </FormConfigContext.Provider>
  );
}

/**
 * @typedef {Object} ExtendedFieldDef
 * @property {string}   id
 * @property {string}   key
 * @property {string}   label
 * @property {string}   type   - text|number|textarea|date|select|toggle|multiselect|checkbox
 * @property {string}   step
 * @property {boolean}  required
 * @property {string}   [placeholder]
 * @property {string}   [hint]
 * @property {*}        [defaultValue]
 * @property {string[]} [options]
 * @property {boolean}  active
 * @property {number}   order
 */

export function useFormConfig() {
  const ctx = useContext(FormConfigContext);
  if (!ctx) throw new Error('useFormConfig must be inside <FormConfigProvider>');
  return ctx;
}
