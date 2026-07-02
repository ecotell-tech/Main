/**
 * FormConfigPage.jsx
 *
 * Leadership / Admin screen to configure the Farmer Registration form.
 * Three tabs:
 *
 *   1. Dropdown Options  — add / remove / reorder / toggle option values for
 *                          every select and toggle-group field.
 *   2. Extended Fields   — define custom fields; assign them to wizard steps;
 *                          values are persisted as JSON on the farmer record.
 *   3. Step Settings     — enable / disable / rename wizard steps.
 */

import { useState, useMemo } from 'react';
import { useFormConfig }     from '@context/FormConfigContext';
import { useToast }          from '@hooks/useToast';
import Button                from '@common/Button/Button';
import Badge                 from '@common/Badge/Badge';
import { cn }                from '@/lib/utils';
import {
  DROPDOWN_META,
  DEFAULT_DROPDOWNS,
  DEFAULT_STEPS,
  FIELD_TYPES,
  EXTENDABLE_STEP_IDS,
} from '@constants/formConfigDefaults';

// ── Shared style helpers ─────────────────────────────────────────────────────
const inputCls  = 'w-full h-9 px-3 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
const selectCls = inputCls;
const labelCls  = 'block text-xs font-semibold mb-1 text-foreground';

// Step-color mapping for visual grouping
const STEP_COLORS = {
  identity:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-500'  },
  location:  { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  farm:      { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  crops:     { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  dot: 'bg-green-600'  },
  practice:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  readiness: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  engage:    { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    dot: 'bg-sky-500'    },
};

function StepBadge({ stepId }) {
  const c = STEP_COLORS[stepId] ?? STEP_COLORS.identity;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.65rem] font-semibold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {stepId}
    </span>
  );
}

// ── Tab switcher ─────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { key: 'dropdowns', label: 'Dropdown Options', icon: 'fas fa-list-ul'    },
    { key: 'extended',  label: 'Extended Fields',  icon: 'fas fa-puzzle-piece' },
    { key: 'steps',     label: 'Step Settings',    icon: 'fas fa-layer-group' },
  ];
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            active === t.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <i className={t.icon} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Dropdown Options
// ═══════════════════════════════════════════════════════════════════════════════
function DropdownConfigTab() {
  const { getAllDropdownOptions, setAllDropdowns, hasCustomConfig } = useFormConfig();
  const { showToast } = useToast();

  // Build local draft from current config for all dropdown keys
  const [draft, setDraft] = useState(() => {
    const d = {};
    for (const key of Object.keys(DROPDOWN_META)) {
      d[key] = getAllDropdownOptions(key).map((o) => ({ ...o }));
    }
    return d;
  });

  // Per-key: new option input text
  const [newOptionText, setNewOptionText] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [openKeys, setOpenKeys] = useState(() => new Set(Object.keys(DROPDOWN_META)));

  // Dirty detection
  const isDirty = useMemo(() => {
    for (const key of Object.keys(draft)) {
      const original = getAllDropdownOptions(key);
      const current  = draft[key];
      if (current.length !== original.length) return true;
      for (let i = 0; i < current.length; i++) {
        if (current[i].value !== original[i]?.value || current[i].active !== original[i]?.active) return true;
      }
    }
    return false;
  }, [draft, getAllDropdownOptions]);

  function toggleKey(key) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleOption(key, idx) {
    setDraft((prev) => {
      const opts = [...prev[key]];
      opts[idx] = { ...opts[idx], active: !opts[idx].active };
      return { ...prev, [key]: opts };
    });
  }

  function deleteOption(key, idx) {
    setDraft((prev) => {
      const opts = [...prev[key]];
      opts.splice(idx, 1);
      return { ...prev, [key]: opts };
    });
  }

  function moveOption(key, idx, dir) {
    setDraft((prev) => {
      const opts = [...prev[key]];
      const target = idx + dir;
      if (target < 0 || target >= opts.length) return prev;
      [opts[idx], opts[target]] = [opts[target], opts[idx]];
      return { ...prev, [key]: opts };
    });
  }

  function addOption(key) {
    const text = (newOptionText[key] ?? '').trim();
    if (!text) return;
    const already = draft[key].some((o) => o.label.toLowerCase() === text.toLowerCase());
    if (already) {
      showToast(`"${text}" already exists in this list.`, 'warning');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      [key]: [...prev[key], { value: text, label: text, active: true }],
    }));
    setNewOptionText((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setAllDropdowns(draft);
      // Re-sync draft from context so isDirty reads false immediately after save.
      setDraft((prev) => {
        const d = {};
        for (const key of Object.keys(prev)) d[key] = prev[key].map((o) => ({ ...o }));
        return d;
      });
      showToast('Dropdown options saved successfully.', 'success');
    } catch (err) {
      showToast(`Failed to save: ${err.message ?? 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const d = {};
    for (const key of Object.keys(DROPDOWN_META)) {
      d[key] = DEFAULT_DROPDOWNS[key].map((o) => ({ ...o }));
    }
    setDraft(d);
    setConfirmReset(false);
    showToast('All dropdown options reset to defaults.', 'success');
  }

  // Group keys by wizard step
  const grouped = useMemo(() => {
    const map = {};
    for (const [key, meta] of Object.entries(DROPDOWN_META)) {
      if (!map[meta.step]) map[meta.step] = [];
      map[meta.step].push({ key, ...meta });
    }
    return map;
  }, []);

  const stepOrder = ['identity', 'farm', 'crops', 'practice', 'readiness', 'engage'];
  const stepLabels = {
    identity: 'Step 1 — Identity',  farm: 'Step 3 — Farm',
    crops: 'Step 4 — Crops',        practice: 'Step 5 — Practice',
    readiness: 'Step 6 — Readiness', engage: 'Step 7 — Engage',
  };

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {hasCustomConfig && (
          <Badge variant="warning">
            <i className="fas fa-triangle-exclamation mr-1" /> Custom options active
          </Badge>
        )}
        {!confirmReset ? (
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <i className="fas fa-rotate-left mr-2" /> Reset Defaults
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <i className="fas fa-triangle-exclamation" />
            <span>Reset all dropdown options?</span>
            <button className="font-bold underline" onClick={handleReset}>Yes, reset</button>
            <button className="underline" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        )}
        <Button disabled={!isDirty || saving} onClick={handleSave}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Changes</>
          }
        </Button>
      </div>

      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
        <i className="fas fa-info-circle mt-0.5 shrink-0" />
        <span>
          Click an option chip to toggle it active/inactive. Inactive options are hidden from agronomists but preserved in existing records.
          Add new options with the text field at the bottom of each group.
        </span>
      </div>

      {/* Groups by step */}
      <div className="space-y-4">
        {stepOrder.map((stepId) => {
          const keys = grouped[stepId] ?? [];
          if (!keys.length) return null;
          const c = STEP_COLORS[stepId] ?? STEP_COLORS.identity;
          return (
            <div key={stepId} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className={cn('px-4 py-3 border-b border-border flex items-center gap-2', c.bg)}>
                <span className={cn('w-2 h-2 rounded-full shrink-0', c.dot)} />
                <span className={cn('text-xs font-bold uppercase tracking-wide', c.text)}>
                  {stepLabels[stepId]}
                </span>
              </div>
              <div className="divide-y divide-border/50">
                {keys.map(({ key, label, icon }) => {
                  const isOpen = openKeys.has(key);
                  const options = draft[key] ?? [];
                  const activeCount = options.filter((o) => o.active).length;
                  return (
                    <div key={key}>
                      {/* Accordion header */}
                      <button
                        type="button"
                        onClick={() => toggleKey(key)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <i className={cn(icon, 'text-muted-foreground text-xs w-4 text-center')} />
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {activeCount}/{options.length} active
                          </span>
                        </div>
                        <i className={cn('fas fa-chevron-down text-[10px] text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3">
                          {/* Option chips */}
                          <div className="flex flex-wrap gap-2">
                            {options.map((opt, idx) => (
                              <div
                                key={opt.value + idx}
                                className={cn(
                                  'flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border text-xs font-medium transition-all',
                                  opt.active
                                    ? 'bg-green-50 border-green-300 text-green-800'
                                    : 'bg-muted/40 border-border text-muted-foreground line-through'
                                )}
                              >
                                <span>{opt.label}</span>
                                {/* Up/Down */}
                                <div className="flex flex-col -gap-0.5 ml-1">
                                  <button
                                    type="button"
                                    onClick={() => moveOption(key, idx, -1)}
                                    disabled={idx === 0}
                                    className="text-[8px] text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                                  >▲</button>
                                  <button
                                    type="button"
                                    onClick={() => moveOption(key, idx, 1)}
                                    disabled={idx === options.length - 1}
                                    className="text-[8px] text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                                  >▼</button>
                                </div>
                                {/* Toggle active */}
                                <button
                                  type="button"
                                  onClick={() => toggleOption(key, idx)}
                                  title={opt.active ? 'Deactivate (hide from form)' : 'Activate (show in form)'}
                                  className={cn(
                                    'w-5 h-5 rounded flex items-center justify-center transition-colors',
                                    opt.active
                                      ? 'bg-green-200 hover:bg-red-100 text-green-700 hover:text-red-600'
                                      : 'bg-muted hover:bg-green-100 text-muted-foreground hover:text-green-700'
                                  )}
                                >
                                  <i className={cn('text-[9px]', opt.active ? 'fas fa-eye' : 'fas fa-eye-slash')} />
                                </button>
                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => deleteOption(key, idx)}
                                  title="Remove option"
                                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                                >
                                  <i className="fas fa-times text-[9px]" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add new option */}
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="flex-1 h-8 px-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="Type new option and press Add…"
                              value={newOptionText[key] ?? ''}
                              onChange={(e) => setNewOptionText((p) => ({ ...p, [key]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(key); } }}
                            />
                            <button
                              type="button"
                              onClick={() => addOption(key)}
                              className="h-8 px-3 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-colors whitespace-nowrap"
                            >
                              <i className="fas fa-plus mr-1" /> Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Extended Fields
// ═══════════════════════════════════════════════════════════════════════════════
const BLANK_FIELD = {
  id:           '',
  key:          '',
  label:        '',
  type:         'text',
  step:         'farm',
  required:     false,
  placeholder:  '',
  hint:         '',
  defaultValue: '',
  options:      [],
  min:          '',
  max:          '',
  active:       true,
  order:        0,
};

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function ExtendedFieldsTab() {
  const { getAllExtendedFields, setExtendedFields } = useFormConfig();
  const { showToast } = useToast();

  const [fields, setFields]     = useState(() => getAllExtendedFields().map((f) => ({ ...f })));
  const [editing, setEditing]   = useState(null);   // null | BLANK_FIELD | existing field
  const [saving, setSaving]     = useState(false);
  const [optionInput, setOptionInput] = useState('');

  function openNew() {
    setEditing({
      ...BLANK_FIELD,
      id:    crypto.randomUUID(),
      order: fields.length,
    });
    setOptionInput('');
  }

  function openEdit(field) {
    setEditing({ ...field });
    setOptionInput('');
  }

  function cancelEdit() {
    setEditing(null);
    setOptionInput('');
  }

  function setEditField(key, value) {
    setEditing((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate key from label if key hasn't been manually changed
      if (key === 'label' && (!prev.key || prev.key === toSlug(prev.label))) {
        next.key = toSlug(value);
      }
      return next;
    });
  }

  function addOption() {
    const text = optionInput.trim();
    if (!text) return;
    if ((editing.options ?? []).includes(text)) return;
    setEditing((prev) => ({ ...prev, options: [...(prev.options ?? []), text] }));
    setOptionInput('');
  }

  function removeOption(opt) {
    setEditing((prev) => ({
      ...prev,
      options: (prev.options ?? []).filter((o) => o !== opt),
    }));
  }

  function saveEditing() {
    if (!editing.label.trim()) {
      showToast('Field label is required.', 'error');
      return;
    }
    if (!editing.key.trim()) {
      showToast('Field key is required.', 'error');
      return;
    }
    const keyConflict = fields.some(
      (f) => f.key === editing.key.trim() && f.id !== editing.id
    );
    if (keyConflict) {
      showToast(`Key "${editing.key}" is already used by another field.`, 'error');
      return;
    }
    if (['select', 'toggle', 'multiselect'].includes(editing.type) && !editing.options?.length) {
      showToast('Add at least one option for this field type.', 'warning');
      return;
    }

    const exists = fields.some((f) => f.id === editing.id);
    let updated;
    if (exists) {
      updated = fields.map((f) => f.id === editing.id ? { ...editing } : f);
    } else {
      updated = [...fields, { ...editing }];
    }
    setFields(updated);
    setEditing(null);
    setOptionInput('');
  }

  function deleteField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function toggleActive(id) {
    setFields((prev) =>
      prev.map((f) => f.id === id ? { ...f, active: !f.active } : f)
    );
  }

  function moveField(idx, dir) {
    setFields((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((f, i) => ({ ...f, order: i }));
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setExtendedFields(fields.map((f, i) => ({ ...f, order: i })));
      showToast('Extended fields saved successfully.', 'success');
    } catch (err) {
      showToast(`Failed to save: ${err.message ?? 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const isDirty = useMemo(() => {
    const original = getAllExtendedFields();
    if (fields.length !== original.length) return true;
    return JSON.stringify(fields) !== JSON.stringify(original);
  }, [fields, getAllExtendedFields]);

  const needsOptions = editing && ['select', 'toggle', 'multiselect'].includes(editing.type);

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
        <i className="fas fa-info-circle mt-0.5 shrink-0" />
        <span>
          Extended fields are extra data points agronomists fill in during registration.
          Values are stored as JSON on the farmer record (<code className="bg-blue-100 px-1 rounded text-xs">custom_fields</code> column),
          so no migration is needed to add or remove them.
        </span>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 justify-between flex-wrap">
        <Button variant="outline" onClick={openNew}>
          <i className="fas fa-plus mr-2" /> Add Field
        </Button>
        <Button disabled={!isDirty || saving || editing !== null} onClick={handleSave}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Changes</>
          }
        </Button>
      </div>

      {/* Edit / Add panel */}
      {editing !== null && (
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="text-sm font-bold text-foreground flex items-center gap-2">
            <i className="fas fa-puzzle-piece text-primary" />
            {editing.id && fields.some((f) => f.id === editing.id) ? 'Edit Field' : 'New Field'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Field Label *</label>
              <input
                className={inputCls}
                placeholder="e.g. Bank IFSC Code"
                value={editing.label}
                onChange={(e) => setEditField('label', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Field Key (snake_case) *</label>
              <input
                className={`${inputCls} font-mono text-xs`}
                placeholder="e.g. bank_ifsc_code"
                value={editing.key}
                onChange={(e) => setEditField('key', toSlug(e.target.value))}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Auto-generated from label. Must be unique.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Field Type *</label>
              <select className={selectCls} value={editing.type} onChange={(e) => setEditField('type', e.target.value)}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Wizard Step *</label>
              <select className={selectCls} value={editing.step} onChange={(e) => setEditField('step', e.target.value)}>
                {EXTENDABLE_STEP_IDS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium pb-1">
                <input
                  type="checkbox"
                  checked={editing.required}
                  onChange={(e) => setEditField('required', e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Required field
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium pb-1">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditField('active', e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Active
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Placeholder text</label>
              <input className={inputCls} placeholder="e.g. Enter 11-character code"
                value={editing.placeholder} onChange={(e) => setEditField('placeholder', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Hint text (shows below field)</label>
              <input className={inputCls} placeholder="e.g. Used for direct transfer"
                value={editing.hint} onChange={(e) => setEditField('hint', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Default value (leave blank for null)</label>
            <input className={inputCls} placeholder="Default value when form opens"
              value={editing.defaultValue ?? ''}
              onChange={(e) => setEditField('defaultValue', e.target.value || null)} />
          </div>

          {/* Min / Max length — for text and number fields */}
          {(editing.type === 'text' || editing.type === 'number') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Min length (characters)</label>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  placeholder="e.g. 6"
                  value={editing.min ?? ''}
                  onChange={(e) => setEditField('min', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Leave blank for no minimum.</p>
              </div>
              <div>
                <label className={labelCls}>Max length (characters)</label>
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  placeholder="e.g. 12"
                  value={editing.max ?? ''}
                  onChange={(e) => setEditField('max', e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Leave blank for no maximum.</p>
              </div>
            </div>
          )}

          {/* Options — only for select/toggle/multiselect */}
          {needsOptions && (
            <div>
              <label className={labelCls}>Options *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(editing.options ?? []).map((opt) => (
                  <span key={opt} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-green-50 border border-green-300 rounded-lg text-xs text-green-800 font-medium">
                    {opt}
                    <button
                      type="button"
                      onClick={() => removeOption(opt)}
                      className="w-4 h-4 rounded hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-green-600 transition-colors"
                    >
                      <i className="fas fa-times text-[8px]" />
                    </button>
                  </span>
                ))}
                {!editing.options?.length && (
                  <span className="text-xs text-muted-foreground italic">No options yet — add below</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-8 px-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Type option and press Add…"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="h-8 px-3 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-colors"
                >
                  <i className="fas fa-plus mr-1" /> Add
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 justify-end">
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
            <Button onClick={saveEditing}>
              <i className="fas fa-check mr-2" />
              {fields.some((f) => f.id === editing.id) ? 'Update Field' : 'Add Field'}
            </Button>
          </div>
        </div>
      )}

      {/* Fields table */}
      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <i className="fas fa-puzzle-piece text-xl text-muted-foreground/50" />
          </div>
          <div className="text-sm font-semibold text-muted-foreground">No extended fields yet</div>
          <div className="text-xs text-muted-foreground/70 max-w-xs">
            Click <strong>Add Field</strong> to define custom data points that agronomists fill in during farmer registration.
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-6">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label / Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Required</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {fields.map((f, idx) => {
                const typeInfo = FIELD_TYPES.find((t) => t.value === f.type);
                return (
                  <tr key={f.id} className={cn('hover:bg-muted/20 transition-colors', !f.active && 'opacity-50')}>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveField(idx, -1)} disabled={idx === 0}
                          className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                        <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}
                          className="text-[9px] text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground text-[0.82rem]">{f.label}</div>
                      <div className="text-[0.62rem] font-mono text-muted-foreground">{f.key}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <i className={typeInfo?.icon ?? 'fas fa-font'} />
                        {typeInfo?.label ?? f.type}
                      </span>
                      {(f.type === 'number' || f.type === 'text') && (f.min !== '' || f.max !== '') && (
                        <span className="text-[10px] text-primary/70 font-mono mt-0.5 block">
                          {f.min !== '' && f.min != null ? `min: ${f.min} chars` : ''}
                          {f.min !== '' && f.min != null && f.max !== '' && f.max != null ? ' · ' : ''}
                          {f.max !== '' && f.max != null ? `max: ${f.max} chars` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StepBadge stepId={f.step} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {f.required
                        ? <span className="text-destructive text-xs font-bold">Yes</span>
                        : <span className="text-muted-foreground text-xs">No</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(f.id)}
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                          f.active
                            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                            : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700'
                        )}
                      >
                        {f.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                          title="Edit"
                        >
                          <i className="fas fa-pen text-[10px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteField(f.id)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                          title="Delete"
                        >
                          <i className="fas fa-trash text-[10px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Step Settings
// ═══════════════════════════════════════════════════════════════════════════════
function StepConfigTab() {
  const { getSteps, setStepConfig } = useFormConfig();
  const { showToast } = useToast();

  const [steps, setSteps] = useState(() => getSteps().map((s) => ({ ...s })));
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => {
    const original = getSteps();
    return steps.some((s, i) => s.enabled !== original[i]?.enabled || s.label !== original[i]?.label);
  }, [steps, getSteps]);

  function toggleStep(id) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id && !s.locked) ? { ...s, enabled: !s.enabled } : s)
    );
  }

  function renameStep(id, label) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id && !s.locked) ? { ...s, label } : s)
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setStepConfig(steps);
      showToast('Step configuration saved.', 'success');
    } catch (err) {
      showToast(`Failed to save: ${err.message ?? 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSteps(DEFAULT_STEPS.map((s) => ({ ...s })));
    showToast('Steps reset to defaults.', 'success');
  }

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
        <i className="fas fa-triangle-exclamation mt-0.5 shrink-0" />
        <span>
          <strong>Identity</strong> and <strong>Review</strong> steps are locked — they cannot be disabled.
          Disabling a step hides it from the wizard and skips its validation.
          Custom extended fields assigned to a disabled step will also be hidden.
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset}>
          <i className="fas fa-rotate-left mr-2" /> Reset Defaults
        </Button>
        <Button disabled={!isDirty || saving} onClick={handleSave}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Changes</>
          }
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Label (displayed in wizard)</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {steps.map((s) => {
              const c = STEP_COLORS[s.id];
              return (
                <tr
                  key={s.id}
                  className={cn(
                    'transition-colors',
                    s.locked ? 'bg-muted/20' : 'hover:bg-muted/10',
                    !s.enabled && !s.locked && 'opacity-60'
                  )}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground text-center">{s.order + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <i className={cn(s.icon, 'text-muted-foreground text-xs w-4 text-center')} />
                      {c ? (
                        <span className={cn('font-mono text-xs px-1.5 py-0.5 rounded', c.bg, c.text)}>{s.id}</span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                      )}
                      {s.locked && (
                        <span className="text-[0.6rem] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold">
                          LOCKED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.locked ? (
                      <span className="text-sm text-foreground font-medium">{s.label}</span>
                    ) : (
                      <input
                        className="h-8 px-2 rounded-lg border border-transparent bg-transparent hover:border-border focus:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm font-medium transition-all w-full max-w-[200px]"
                        value={s.label}
                        onChange={(e) => renameStep(s.id, e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.locked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-semibold">
                        <i className="fas fa-lock text-[9px]" /> Always on
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleStep(s.id)}
                        className={cn(
                          'relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          s.enabled ? 'bg-primary' : 'bg-muted'
                        )}
                        role="switch"
                        aria-checked={s.enabled}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5',
                          s.enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                        )} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Root page
// ═══════════════════════════════════════════════════════════════════════════════
export default function FormConfigPage() {
  const [activeTab, setActiveTab] = useState('dropdowns');
  const { hasCustomConfig, configuredBy, loading } = useFormConfig();

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-foreground font-heading flex items-center gap-2">
            <i className="fas fa-sliders text-primary" />
            Form Configuration
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure dropdown options, add custom fields, and manage wizard steps for the Farmer Registration form.
            {hasCustomConfig && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                <i className="fas fa-triangle-exclamation" /> Custom config active
              </span>
            )}
          </p>
          {configuredBy && (
            <p className="text-xs text-muted-foreground mt-1">
              Last configured by <strong>{configuredBy}</strong>
            </p>
          )}
        </div>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <i className="fas fa-spinner fa-spin text-lg" />
          <span className="text-sm">Loading configuration from server…</span>
        </div>
      ) : (
        <>
          {activeTab === 'dropdowns' && <DropdownConfigTab />}
          {activeTab === 'extended'  && <ExtendedFieldsTab />}
          {activeTab === 'steps'     && <StepConfigTab />}
        </>
      )}
    </div>
  );
}
