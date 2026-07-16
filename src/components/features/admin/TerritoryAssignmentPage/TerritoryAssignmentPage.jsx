/**
 * TerritoryAssignmentPage — Organic Farming Manager
 * Screen 35: District-level territory assignment to field representatives
 *
 * Simplified from an earlier 4-level (State/District/Taluka/Village) mock design —
 * the real `territories` table only supports State/District granularity, so
 * assignment happens at the district level. State nodes are shown for navigation
 * only and aren't directly assignable.
 */
import { useState, useEffect, useMemo } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { useToast } from '@hooks/useToast';
import { fetchStates, fetchDistricts } from '@services/geographyService';
import { getUsers } from '@services/userService';
import { getTerritoryAssignments, assignDistrict, unassignDistrict } from '@services/territoryService';
import { ApiError } from '@services/api';

export default function TerritoryAssignmentPage() {
  const { showToast } = useToast();

  const [states,      setStates]      = useState([]);
  const [reps,        setReps]        = useState([]);
  const [assignments, setAssignments] = useState([]); // [{districtId, districtName, stateId, userId, userName}]
  const [districtsByState, setDistrictsByState] = useState({}); // stateId -> district[] | 'loading'
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  const [repFilter, setRepFilter] = useState('all');
  const [selected,  setSelected]  = useState(null); // { type: 'state'|'district', stateId, stateName, districtId, districtName }
  const [assignTo,  setAssignTo]  = useState('');
  const [expandedStates, setExpandedStates] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statesRes, users, assignmentsRes] = await Promise.all([
          fetchStates(),
          getUsers(),
          getTerritoryAssignments(),
        ]);
        if (cancelled) return;
        setStates(statesRes);
        setReps(users.filter(u => u.role === 'agronomist'));
        setAssignments(assignmentsRes);
      } catch {
        if (!cancelled) showToast('Failed to load territory data.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignmentByDistrictId = useMemo(() => {
    const map = new Map();
    assignments.forEach(a => map.set(a.districtId, a));
    return map;
  }, [assignments]);

  async function toggleState(state) {
    setExpandedStates(prev => ({ ...prev, [state.id]: !prev[state.id] }));
    if (!districtsByState[state.id]) {
      setDistrictsByState(prev => ({ ...prev, [state.id]: 'loading' }));
      try {
        const districts = await fetchDistricts(state.id);
        setDistrictsByState(prev => ({ ...prev, [state.id]: districts }));
      } catch {
        showToast(`Failed to load districts for ${state.name}.`, 'error');
        setDistrictsByState(prev => ({ ...prev, [state.id]: [] }));
      }
    }
  }

  function selectState(state) {
    setSelected({ type: 'state', stateId: state.id, stateName: state.name });
    setAssignTo('');
  }

  function selectDistrict(state, district) {
    setSelected({ type: 'district', stateId: state.id, stateName: state.name, districtId: district.id, districtName: district.name });
    const current = assignmentByDistrictId.get(district.id);
    setAssignTo(current ? String(current.userId) : '');
  }

  async function handleAssign() {
    if (!selected || selected.type !== 'district') { showToast('Select a district first.', 'error'); return; }
    if (!assignTo) { showToast('Select a representative.', 'error'); return; }
    const rep = reps.find(r => r.id === Number(assignTo));

    setSaving(true);
    try {
      await assignDistrict(selected.districtId, Number(assignTo));
      setAssignments(prev => [
        ...prev.filter(a => a.districtId !== selected.districtId),
        { districtId: selected.districtId, districtName: selected.districtName, stateId: selected.stateId, userId: Number(assignTo), userName: rep?.name ?? 'Rep' },
      ]);
      showToast(`${selected.districtName} assigned to ${rep?.name}.`, 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to assign district. Please try again.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign() {
    if (!selected || selected.type !== 'district') return;
    setSaving(true);
    try {
      await unassignDistrict(selected.districtId);
      setAssignments(prev => prev.filter(a => a.districtId !== selected.districtId));
      showToast(`${selected.districtName} unassigned.`, 'info');
      setAssignTo('');
    } catch {
      showToast('Failed to unassign district.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const selCls = 'h-9 pl-3 pr-8 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none w-full';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <i className="fas fa-spinner fa-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Territory Assignment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign districts to field representatives</p>
        </div>
        <div className="relative">
          <select value={repFilter} onChange={e => setRepFilter(e.target.value)} className={selCls.replace('w-full', 'w-48')}>
            <option value="all">View all territories</option>
            {reps.map(r => <option key={r.id} value={r.id}>Filter: {r.name.split(' ')[0]}</option>)}
          </select>
          <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Hierarchy tree */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
            <i className="fas fa-sitemap text-sm text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">Territory Hierarchy</span>
          </div>
          <div className="overflow-y-auto max-h-[32rem] p-4 space-y-1">
            {states.map(state => {
              const stateOpen = !!expandedStates[state.id];
              const districts = districtsByState[state.id];
              return (
                <div key={state.id}>
                  {/* STATE */}
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selected?.type === 'state' && selected.stateId === state.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-muted/30 text-foreground'}`}
                    onClick={() => { toggleState(state); selectState(state); }}
                  >
                    <i className="fas fa-map text-blue-600 text-xs w-4" />
                    {state.name}
                    <i className={`fas fa-chevron-${stateOpen ? 'down' : 'right'} ml-auto text-[0.6rem] text-muted-foreground`} />
                  </button>

                  {stateOpen && districts === 'loading' && (
                    <div className="ml-9 py-2 text-[0.65rem] text-muted-foreground">
                      <i className="fas fa-spinner fa-spin mr-1.5" /> Loading districts…
                    </div>
                  )}

                  {stateOpen && Array.isArray(districts) && districts.map(district => {
                    const assignedRep = assignmentByDistrictId.get(district.id);
                    const show = repFilter === 'all' || String(assignedRep?.userId) === repFilter;
                    if (!show) return null;
                    return (
                      <button
                        key={district.id}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ml-5 ${selected?.type === 'district' && selected.districtId === district.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-muted/20 text-foreground'}`}
                        onClick={() => selectDistrict(state, district)}
                      >
                        <i className="fas fa-city text-purple-600 text-xs w-4" />
                        {district.name}
                        {assignedRep && (
                          <span className="ml-1 text-[0.58rem] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{assignedRep.userName.split(' ')[0]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Assignment panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">Assignment Panel</span>
            </div>
            <div className="p-5 space-y-4">
              {selected?.type === 'district' ? (
                <>
                  <div className="px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[0.6rem] text-blue-600 uppercase font-bold mb-0.5">Selected District</div>
                    <div className="text-sm font-bold text-blue-800">{selected.districtName}</div>
                    <div className="text-[0.65rem] text-blue-600 mt-0.5">{selected.stateName} › {selected.districtName}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Assign to Representative</label>
                    <div className="relative">
                      <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className={selCls}>
                        <option value="">Select rep…</option>
                        {reps.filter(r => r.status === 'active').map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1" onClick={handleAssign} disabled={!assignTo || saving}>
                      {saving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check mr-1.5" /> Assign</>}
                    </Button>
                    <Button variant="outline" onClick={handleUnassign} disabled={saving || !assignmentByDistrictId.has(selected.districtId)}
                      className="text-red-500 border-red-200 hover:bg-red-50">
                      <i className="fas fa-xmark" />
                    </Button>
                  </div>
                </>
              ) : selected?.type === 'state' ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <i className="fas fa-map-location-dot text-xl text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">Expand {selected.stateName} and select a district to assign it</div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <i className="fas fa-map-location-dot text-xl text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">Click any State to expand, then select a District to assign it to a representative</div>
                </div>
              )}
            </div>
          </div>

          {/* Rep summary */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">Rep Coverage</span>
            </div>
            <div className="p-4 space-y-3">
              {reps.map(rep => {
                const districtCount = assignments.filter(a => a.userId === rep.id).length;
                return (
                  <div key={rep.id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                      style={{ background: rep.status === 'active' ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : '#9ca3af' }}>
                      {rep.initials ?? rep.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{rep.name}</div>
                      <div className="text-[0.62rem] text-muted-foreground">{districtCount} district{districtCount === 1 ? '' : 's'}</div>
                    </div>
                    <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
