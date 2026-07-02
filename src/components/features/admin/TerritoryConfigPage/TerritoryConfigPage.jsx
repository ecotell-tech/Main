/**
 * TerritoryConfigPage
 *
 * Team Lead / Admin / Manager screen to:
 *  1. Add new districts / talukas / villages to the database.
 *  2. Select which geography areas their team covers (saved as territory config).
 *
 * Tree is lazily loaded — children are fetched only when a row is expanded.
 * Checkboxes at every level are independent (state, district, taluka, village).
 * Config is stored as JSON in form_templates.territory via PUT /form-config/territory.
 */

import { useState, useEffect, useRef } from 'react';
import { useToast }                    from '@hooks/useToast';
import Button                          from '@common/Button/Button';
import { cn }                          from '@/lib/utils';
import {
  fetchStates,
  fetchDistricts,
  fetchTalukas,
  fetchVillages,
  createState,
  createDistrict,
  createTaluka,
  createVillage,
} from '@services/geographyService';
import { fetchFormTemplate, saveSectionToTemplate } from '@services/formConfigService';

// ── Shared atoms ───────────────────────────────────────────────────────────────

function ExpandIcon({ spinning, expanded }) {
  if (spinning)
    return <i className="fas fa-spinner fa-spin w-4 text-center text-xs text-muted-foreground flex-shrink-0" />;
  return (
    <i className={cn(
      'fas w-4 text-center text-xs text-muted-foreground flex-shrink-0 transition-transform duration-150',
      expanded ? 'fa-chevron-down' : 'fa-chevron-right',
    )} />
  );
}

function Chip({ color, label }) {
  const palette = {
    blue:   'bg-blue-100   text-blue-700',
    green:  'bg-green-100  text-green-700',
    amber:  'bg-amber-100  text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={cn('text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0', palette[color])}>
      {label}
    </span>
  );
}

// Inline add-row shown inside the tree when user clicks "+ Add …"
function AddForm({ placeholder, indent, onConfirm, onCancel, saving, extraField }) {
  const [name, setName]       = useState('');
  const [extra, setExtra]     = useState('');
  const inputRef              = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(e) {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed, extra.trim() || null);
  }

  return (
    <form
      onSubmit={submit}
      onClick={(e) => e.stopPropagation()}
      className={cn('flex items-center gap-2 py-2 pr-4 bg-white border-t border-border/30', indent)}
    >
      <span className="w-4 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        disabled={saving}
        className="flex-1 min-w-0 h-7 px-2 text-sm rounded border border-input focus:outline-none focus:ring-1 focus:ring-ring bg-white disabled:opacity-60"
      />
      {extraField && (
        <input
          type="text"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={extraField}
          disabled={saving}
          className="w-24 h-7 px-2 text-sm rounded border border-input focus:outline-none focus:ring-1 focus:ring-ring bg-white disabled:opacity-60"
        />
      )}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="flex-shrink-0 w-6 h-6 rounded bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-xs flex items-center justify-center"
        title="Add"
      >
        {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        disabled={saving}
        className="flex-shrink-0 w-6 h-6 rounded bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs flex items-center justify-center"
        title="Cancel"
      >
        <i className="fas fa-xmark" />
      </button>
    </form>
  );
}

// Small inline "+ Add …" trigger button
function AddTrigger({ label, indent, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        'flex items-center gap-1.5 py-2 pr-4 text-xs text-muted-foreground hover:text-blue-600 transition-colors w-full border-t border-border/20',
        indent,
      )}
    >
      <span className="w-4 flex-shrink-0" />
      <i className="fas fa-plus text-[0.6rem]" />
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TerritoryConfigPage() {
  const { showToast } = useToast();

  const [states, setStates]           = useState([]);
  const [childrenMap, setChildrenMap] = useState({});
  const [expandedMap, setExpandedMap] = useState({});
  const [loadingKeys, setLoadingKeys] = useState(new Set());

  // addingMap key: "district-{stateId}" | "taluka-{districtId}" | "village-{talukaId}"
  // value: true = form visible
  const [addingMap, setAddingMap]     = useState({});
  const [savingAdd, setSavingAdd]     = useState(new Set());

  const [sel, setSel] = useState({
    state: new Set(), district: new Set(), taluka: new Set(), village: new Set(),
  });

  const [configuredBy, setConfiguredBy] = useState('');
  const [pageLoading, setPageLoading]   = useState(true);
  const [saving, setSaving]             = useState(false);

  // ── Load states + existing territory config ───────────────────────────────
  useEffect(() => {
    Promise.all([fetchStates(), fetchFormTemplate()])
      .then(([stateList, tmpl]) => {
        setStates(stateList);
        setConfiguredBy(tmpl.configured_by_name || '');
        const tc = tmpl.territory;
        if (tc) {
          setSel({
            state:    new Set(tc.state_ids    ?? []),
            district: new Set(tc.district_ids ?? []),
            taluka:   new Set(tc.taluka_ids   ?? []),
            village:  new Set(tc.village_ids  ?? []),
          });
        }
      })
      .catch(() => showToast('Failed to load territory data', 'error'))
      .finally(() => setPageLoading(false));
  }, []);

  // ── Expand / collapse + lazy-load children ────────────────────────────────
  async function handleExpand(level, parentId, childType, fetchFn) {
    const expandKey = `${level}-${parentId}`;
    const expanding = !expandedMap[expandKey];
    setExpandedMap((prev) => ({ ...prev, [expandKey]: expanding }));
    if (!expanding) return;

    const childKey = `${childType}-of-${parentId}`;
    if (childrenMap[childKey]) return;

    setLoadingKeys((prev) => new Set([...prev, childKey]));
    try {
      const data = await fetchFn();
      setChildrenMap((prev) => ({ ...prev, [childKey]: data }));
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoadingKeys((prev) => { const s = new Set(prev); s.delete(childKey); return s; });
    }
  }

  // ── Checkbox toggle ───────────────────────────────────────────────────────
  function toggle(level, id, e) {
    e.stopPropagation();
    setSel((prev) => {
      const set = new Set(prev[level]);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, [level]: set };
    });
  }

  // ── Create handlers ───────────────────────────────────────────────────────
  async function handleCreate(addKey, childListKey, createFn, newItem, onSuccess) {
    setSavingAdd((prev) => new Set([...prev, addKey]));
    try {
      const created = await createFn();
      if (onSuccess) {
        onSuccess(created);
      } else {
        setChildrenMap((prev) => ({
          ...prev,
          [childListKey]: [...(prev[childListKey] ?? []), created],
        }));
      }
      setAddingMap((prev) => ({ ...prev, [addKey]: false }));
      showToast(`"${newItem}" added successfully`, 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to add item', 'error');
    } finally {
      setSavingAdd((prev) => { const s = new Set(prev); s.delete(addKey); return s; });
    }
  }

  // ── Save territory config ─────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const tmpl = await saveSectionToTemplate('territory', {
        state_ids:    [...sel.state],
        district_ids: [...sel.district],
        taluka_ids:   [...sel.taluka],
        village_ids:  [...sel.village],
      });
      setConfiguredBy(tmpl.configured_by_name || '');
      showToast('Territory configuration saved', 'success');
    } catch {
      showToast('Failed to save territory configuration', 'error');
    } finally {
      setSaving(false);
    }
  }

  const totalSel = sel.state.size + sel.district.size + sel.taluka.size + sel.village.size;

  // ── Render helpers ────────────────────────────────────────────────────────

  function checkbox(level, id) {
    return (
      <input
        type="checkbox"
        className="w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0"
        checked={sel[level].has(id)}
        onChange={() => {}}
        onClick={(e) => toggle(level, id, e)}
      />
    );
  }

  function countChip(items, level, color) {
    if (!items) return null;
    const n = items.filter((x) => sel[level].has(x.id)).length;
    if (n === 0) return null;
    const noun = { district: 'dist', taluka: 'taluka', village: 'village' }[level] ?? level;
    return <Chip color={color} label={`${n} ${noun}${n !== 1 ? 's' : ''}`} />;
  }

  // ── Village level ─────────────────────────────────────────────────────────
  function renderVillages(talukaId) {
    const childKey = `village-of-${talukaId}`;
    const addKey   = `village-${talukaId}`;

    if (loadingKeys.has(childKey))
      return <LoadingRow indent="pl-[6.5rem]" label="villages" />;

    const villages = childrenMap[childKey];
    const isAdding = addingMap[addKey];
    const isSaving = savingAdd.has(addKey);

    return (
      <>
        {villages && villages.length === 0 && !isAdding && (
          <EmptyRow indent="pl-[6.5rem]" label="No villages yet" />
        )}
        {villages && villages.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-2 py-2 pl-[6.5rem] pr-4 hover:bg-purple-50/40 transition-colors"
          >
            <span className="w-4 flex-shrink-0" />
            {checkbox('village', v.id)}
            <i className="fas fa-home w-4 text-center text-purple-400 text-[0.65rem] flex-shrink-0" />
            <span className="text-sm text-foreground">{v.name}</span>
            {v.pin_code && <span className="text-xs text-muted-foreground ml-auto">{v.pin_code}</span>}
          </div>
        ))}

        {isAdding ? (
          <AddForm
            indent="pl-[6.5rem]"
            placeholder="Village name"
            extraField="Pin code (optional)"
            saving={isSaving}
            onConfirm={(name, pinCode) =>
              handleCreate(
                addKey,
                childKey,
                () => createVillage(talukaId, name, pinCode),
                name,
              )
            }
            onCancel={() => setAddingMap((prev) => ({ ...prev, [addKey]: false }))}
          />
        ) : (
          villages && (
            <AddTrigger
              indent="pl-[6.5rem]"
              label="Add Village"
              onClick={() => setAddingMap((prev) => ({ ...prev, [addKey]: true }))}
            />
          )
        )}
      </>
    );
  }

  // ── Taluka level ──────────────────────────────────────────────────────────
  function renderTalukas(districtId) {
    const childKey = `taluka-of-${districtId}`;
    const addKey   = `taluka-${districtId}`;

    if (loadingKeys.has(childKey))
      return <LoadingRow indent="pl-20" label="talukas" />;

    const talukas  = childrenMap[childKey];
    const isAdding = addingMap[addKey];
    const isSaving = savingAdd.has(addKey);

    return (
      <>
        {talukas && talukas.length === 0 && !isAdding && (
          <EmptyRow indent="pl-20" label="No talukas yet" />
        )}
        {talukas && talukas.map((t) => {
          const expKey     = `taluka-${t.id}`;
          const isExp      = expandedMap[expKey];
          const villCKey   = `village-of-${t.id}`;
          const isSpinning = loadingKeys.has(villCKey);
          const villages   = childrenMap[villCKey];

          return (
            <div key={t.id} className="border-t border-border/30">
              <div
                className="flex items-center gap-2 py-2.5 pl-20 pr-4 hover:bg-amber-50/40 cursor-pointer transition-colors"
                onClick={() => handleExpand('taluka', t.id, 'village', () => fetchVillages(t.id))}
              >
                <ExpandIcon spinning={isSpinning && !isExp} expanded={isExp} />
                {checkbox('taluka', t.id)}
                <i className="fas fa-map-marker-alt w-4 text-center text-amber-500 text-xs flex-shrink-0" />
                <span className="text-sm text-foreground flex-1 min-w-0">{t.name}</span>
                {countChip(villages, 'village', 'purple')}
              </div>
              {isExp && renderVillages(t.id)}
            </div>
          );
        })}

        {isAdding ? (
          <AddForm
            indent="pl-20"
            placeholder="Taluka name"
            saving={isSaving}
            onConfirm={(name) =>
              handleCreate(
                addKey,
                childKey,
                () => createTaluka(districtId, name),
                name,
              )
            }
            onCancel={() => setAddingMap((prev) => ({ ...prev, [addKey]: false }))}
          />
        ) : (
          talukas && (
            <AddTrigger
              indent="pl-20"
              label="Add Taluka"
              onClick={() => setAddingMap((prev) => ({ ...prev, [addKey]: true }))}
            />
          )
        )}
      </>
    );
  }

  // ── District level ────────────────────────────────────────────────────────
  function renderDistricts(stateId) {
    const childKey = `district-of-${stateId}`;
    const addKey   = `district-${stateId}`;

    if (loadingKeys.has(childKey))
      return <LoadingRow indent="pl-12" label="districts" />;

    const districts = childrenMap[childKey];
    const isAdding  = addingMap[addKey];
    const isSaving  = savingAdd.has(addKey);

    return (
      <>
        {districts && districts.length === 0 && !isAdding && (
          <EmptyRow indent="pl-12" label="No districts yet" />
        )}
        {districts && districts.map((d) => {
          const expKey     = `district-${d.id}`;
          const isExp      = expandedMap[expKey];
          const talCKey    = `taluka-of-${d.id}`;
          const isSpinning = loadingKeys.has(talCKey);
          const talukas    = childrenMap[talCKey];

          return (
            <div key={d.id} className="border-t border-border/30">
              <div
                className="flex items-center gap-2 py-2.5 pl-12 pr-4 hover:bg-green-50/40 cursor-pointer transition-colors"
                onClick={() => handleExpand('district', d.id, 'taluka', () => fetchTalukas(d.id))}
              >
                <ExpandIcon spinning={isSpinning && !isExp} expanded={isExp} />
                {checkbox('district', d.id)}
                <i className="fas fa-map w-4 text-center text-green-500 text-xs flex-shrink-0" />
                <span className="text-sm text-foreground flex-1 min-w-0">{d.name}</span>
                {countChip(talukas, 'taluka', 'amber')}
              </div>
              {isExp && (
                <div className="bg-amber-50/20">
                  {renderTalukas(d.id)}
                </div>
              )}
            </div>
          );
        })}

        {isAdding ? (
          <AddForm
            indent="pl-12"
            placeholder="District name"
            saving={isSaving}
            onConfirm={(name) =>
              handleCreate(
                addKey,
                childKey,
                () => createDistrict(stateId, name),
                name,
              )
            }
            onCancel={() => setAddingMap((prev) => ({ ...prev, [addKey]: false }))}
          />
        ) : (
          districts && (
            <AddTrigger
              indent="pl-12"
              label="Add District"
              onClick={() => setAddingMap((prev) => ({ ...prev, [addKey]: true }))}
            />
          )
        )}
      </>
    );
  }

  // ── State level ───────────────────────────────────────────────────────────
  function renderStates() {
    const addKey   = 'state-new';
    const isAdding = addingMap[addKey];
    const isSaving = savingAdd.has(addKey);

    return (
      <>
        {!pageLoading && states.length === 0 && !isAdding && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No states yet. Click "+ Add State" below to get started.
          </div>
        )}

        {states.map((s) => {
          const expKey     = `state-${s.id}`;
          const isExp      = expandedMap[expKey];
          const distCKey   = `district-of-${s.id}`;
          const isSpinning = loadingKeys.has(distCKey);
          const districts  = childrenMap[distCKey];

          return (
            <div key={s.id} className="border-b border-border/50 last:border-b-0">
              <div
                className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => handleExpand('state', s.id, 'district', () => fetchDistricts(s.id))}
              >
                <ExpandIcon spinning={isSpinning && !isExp} expanded={isExp} />
                {checkbox('state', s.id)}
                <i className="fas fa-globe-asia w-4 text-center text-blue-500 text-sm flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground flex-1 min-w-0">{s.name}</span>
                {s.code && <span className="text-xs text-muted-foreground">{s.code}</span>}
                {countChip(districts, 'district', 'green')}
              </div>

              {isExp && (
                <div className="bg-slate-50/60">
                  {renderDistricts(s.id)}
                </div>
              )}
            </div>
          );
        })}

        {isAdding ? (
          <AddForm
            indent="px-4"
            placeholder="State name"
            extraField="Code (e.g. MH)"
            saving={isSaving}
            onConfirm={(name, code) =>
              handleCreate(
                addKey,
                null,
                () => createState(name, code),
                name,
                (created) => setStates((prev) => [...prev, created]),
              )
            }
            onCancel={() => setAddingMap((prev) => ({ ...prev, [addKey]: false }))}
          />
        ) : (
          !pageLoading && (
            <AddTrigger
              indent="px-4"
              label="Add State"
              onClick={() => setAddingMap((prev) => ({ ...prev, [addKey]: true }))}
            />
          )
        )}
      </>
    );
  }

  // ── Page layout ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Territory Configuration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add districts, talukas and villages, then select the areas your team covers.
          </p>
          {configuredBy && (
            <p className="text-xs text-muted-foreground mt-1">
              <i className="fas fa-circle-check text-green-500 mr-1" />
              Last saved by <strong>{configuredBy}</strong>
            </p>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex-shrink-0">
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-floppy-disk mr-2" />Save Configuration</>}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><i className="fas fa-globe-asia text-blue-500 mr-1" />State</span>
        <span><i className="fas fa-map text-green-500 mr-1" />District</span>
        <span><i className="fas fa-map-marker-alt text-amber-500 mr-1" />Taluka</span>
        <span><i className="fas fa-home text-purple-400 mr-1" />Village</span>
        <span className="text-border">|</span>
        <span><i className="fas fa-arrow-pointer mr-1" />Click row to expand · checkbox to select for territory</span>
      </div>

      {/* Selection summary */}
      {totalSel > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-muted/30 rounded-lg text-xs">
          <span className="text-muted-foreground font-medium">Selected:</span>
          {sel.state.size > 0    && <Chip color="blue"   label={`${sel.state.size} State${sel.state.size !== 1 ? 's' : ''}`}         />}
          {sel.district.size > 0 && <Chip color="green"  label={`${sel.district.size} District${sel.district.size !== 1 ? 's' : ''}`} />}
          {sel.taluka.size > 0   && <Chip color="amber"  label={`${sel.taluka.size} Taluka${sel.taluka.size !== 1 ? 's' : ''}`}       />}
          {sel.village.size > 0  && <Chip color="purple" label={`${sel.village.size} Village${sel.village.size !== 1 ? 's' : ''}`}    />}
          <button
            className="ml-auto text-muted-foreground hover:text-destructive text-xs hover:underline"
            onClick={() => setSel({ state: new Set(), district: new Set(), taluka: new Set(), village: new Set() })}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="border border-border rounded-xl overflow-hidden bg-white">
        {pageLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <i className="fas fa-spinner fa-spin text-2xl mb-3 block" />
            Loading geography data…
          </div>
        ) : (
          renderStates()
        )}
      </div>
    </div>
  );
}

// ── Micro-components ───────────────────────────────────────────────────────────

function LoadingRow({ indent, label }) {
  return (
    <div className={cn('py-2 text-xs text-muted-foreground flex items-center gap-1.5', indent)}>
      <i className="fas fa-spinner fa-spin" /> Loading {label}…
    </div>
  );
}

function EmptyRow({ indent, label }) {
  return (
    <div className={cn('py-2 text-xs text-muted-foreground italic', indent)}>
      {label}
    </div>
  );
}
