/**
 * TerritoryAssignmentPage — Organic Farming Manager
 * Screen 35: 4-level hierarchy (State → District → Taluka → Village) with rep assignment
 */
import { useState, useMemo } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { useToast } from '@hooks/useToast';
import MOCK_FARMERS from '@data/mock/farmers.json';
import MOCK_REPS    from '@data/mock/representatives.json';

/* Build hierarchy */
const buildHierarchy = () => {
  const tree = {};
  MOCK_FARMERS.forEach(f => {
    const state = f.state ?? 'Maharashtra';
    if (!tree[state]) tree[state] = {};
    if (!tree[state][f.district]) tree[state][f.district] = {};
    if (!tree[state][f.district][f.taluka]) tree[state][f.district][f.taluka] = new Set();
    tree[state][f.district][f.taluka].add(f.village);
  });
  // Convert Sets to sorted arrays
  Object.values(tree).forEach(d =>
    Object.values(d).forEach(t =>
      Object.keys(t).forEach(k => { t[k] = [...t[k]].sort(); })
    )
  );
  return tree;
};

const HIERARCHY = buildHierarchy();

export default function TerritoryAssignmentPage() {
  const { showToast } = useToast();
  const [repFilter, setRepFilter] = useState('all');
  const [selected, setSelected]   = useState(null); // { type, state, district, taluka, village }
  const [assignTo, setAssignTo]   = useState('');
  const [expanded, setExpanded]   = useState({ state: {}, district: {}, taluka: {} });

  /* Build flat assignment map from reps' district field */
  const assignments = useMemo(() => {
    const map = {}; // key: district → repId
    MOCK_REPS.forEach(rep => {
      if (rep.district) {
        rep.district.split(',').map(s => s.trim()).forEach(d => {
          map[d] = rep.id;
        });
      }
    });
    return map;
  }, []);

  function toggle(level, key) {
    setExpanded(prev => ({
      ...prev,
      [level]: { ...prev[level], [key]: !prev[level][key] },
    }));
  }

  function handleSelect(nodeInfo) {
    setSelected(nodeInfo);
    setAssignTo('');
  }

  function handleAssign() {
    if (!selected) { showToast('Select a territory node first.', 'error'); return; }
    if (!assignTo)  { showToast('Select a representative.', 'error');      return; }
    const rep = MOCK_REPS.find(r => r.id === assignTo);
    const label = selected.village ?? selected.taluka ?? selected.district ?? selected.state;
    showToast(`${label} assigned to ${rep?.name}.`, 'success');
    setSelected(null);
    setAssignTo('');
  }

  function handleUnassign() {
    if (!selected) return;
    const label = selected.village ?? selected.taluka ?? selected.district ?? selected.state;
    showToast(`${label} unassigned.`, 'info');
    setSelected(null);
  }

  const selectedLabel = selected
    ? selected.village ?? selected.taluka ?? selected.district ?? selected.state
    : null;

  const selCls = 'h-9 pl-3 pr-8 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none w-full';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Territory Assignment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Assign districts, talukas, or villages to field representatives</p>
        </div>
        <div className="relative">
          <select value={repFilter} onChange={e => setRepFilter(e.target.value)} className={selCls.replace('w-full', 'w-48')}>
            <option value="all">View all territories</option>
            {MOCK_REPS.map(r => <option key={r.id} value={r.id}>Filter: {r.name.split(' ')[0]}</option>)}
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
            {Object.entries(HIERARCHY).map(([state, districts]) => {
              const stateKey   = state;
              const stateOpen  = expanded.state[stateKey] !== false; // open by default
              return (
                <div key={state}>
                  {/* STATE */}
                  <button
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selected?.state === state && !selected.district ? 'bg-blue-100 text-blue-700' : 'hover:bg-muted/30 text-foreground'}`}
                    onClick={() => { toggle('state', stateKey); handleSelect({ type: 'state', state }); }}
                  >
                    <i className="fas fa-map text-blue-600 text-xs w-4" />
                    {state}
                    <Badge variant="muted" className="ml-auto text-[0.6rem]">{Object.keys(districts).length} districts</Badge>
                    <i className={`fas fa-chevron-${stateOpen ? 'down' : 'right'} text-[0.6rem] text-muted-foreground`} />
                  </button>

                  {stateOpen && Object.entries(districts).map(([district, talukas]) => {
                    const distKey  = `${state}::${district}`;
                    const distOpen = expanded.district[distKey] ?? false;
                    const assignedRep = assignments[district]
                      ? MOCK_REPS.find(r => r.id === assignments[district])
                      : null;
                    const show = repFilter === 'all' || assignedRep?.id === repFilter;
                    if (!show) return null;
                    return (
                      <div key={district} className="ml-5">
                        <button
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${selected?.district === district && !selected.taluka ? 'bg-blue-100 text-blue-700' : 'hover:bg-muted/20 text-foreground'}`}
                          onClick={() => { toggle('district', distKey); handleSelect({ type: 'district', state, district }); }}
                        >
                          <i className="fas fa-city text-purple-600 text-xs w-4" />
                          {district}
                          {assignedRep && (
                            <span className="ml-1 text-[0.58rem] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">{assignedRep.name.split(' ')[0]}</span>
                          )}
                          <Badge variant="muted" className="ml-auto text-[0.58rem]">{Object.keys(talukas).length} talukas</Badge>
                          <i className={`fas fa-chevron-${distOpen ? 'down' : 'right'} text-[0.55rem] text-muted-foreground`} />
                        </button>

                        {distOpen && Object.entries(talukas).map(([taluka, villages]) => {
                          const talKey  = `${distKey}::${taluka}`;
                          const talOpen = expanded.taluka[talKey] ?? false;
                          return (
                            <div key={taluka} className="ml-5">
                              <button
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selected?.taluka === taluka && !selected.village ? 'bg-blue-100 text-blue-700' : 'hover:bg-muted/20 text-foreground'}`}
                                onClick={() => { toggle('taluka', talKey); handleSelect({ type: 'taluka', state, district, taluka }); }}
                              >
                                <i className="fas fa-map-pin text-teal-600 text-xs w-4" />
                                {taluka}
                                <Badge variant="muted" className="ml-auto text-[0.58rem]">{villages.length} villages</Badge>
                                <i className={`fas fa-chevron-${talOpen ? 'down' : 'right'} text-[0.55rem] text-muted-foreground`} />
                              </button>

                              {talOpen && villages.map(village => (
                                <button
                                  key={village}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[0.7rem] ml-5 transition-colors ${selected?.village === village ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-muted/20 text-muted-foreground hover:text-foreground'}`}
                                  onClick={() => handleSelect({ type: 'village', state, district, taluka, village })}
                                >
                                  <i className="fas fa-house text-amber-500 text-[0.6rem] w-4" />
                                  {village}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
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
              {selectedLabel ? (
                <>
                  <div className="px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-[0.6rem] text-blue-600 uppercase font-bold mb-0.5">Selected {selected.type}</div>
                    <div className="text-sm font-bold text-blue-800">{selectedLabel}</div>
                    {selected.district && (
                      <div className="text-[0.65rem] text-blue-600 mt-0.5">
                        {[selected.state, selected.district, selected.taluka, selected.village].filter(Boolean).join(' › ')}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Assign to Representative</label>
                    <div className="relative">
                      <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className={selCls}>
                        <option value="">Select rep…</option>
                        {MOCK_REPS.filter(r => r.status === 'active').map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1" onClick={handleAssign} disabled={!assignTo}>
                      <i className="fas fa-check mr-1.5" /> Assign
                    </Button>
                    <Button variant="outline" onClick={handleUnassign} className="text-red-500 border-red-200 hover:bg-red-50">
                      <i className="fas fa-xmark" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                    <i className="fas fa-map-location-dot text-xl text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">Click any State, District, Taluka, or Village to assign it to a representative</div>
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
              {MOCK_REPS.map(rep => (
                <div key={rep.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                    style={{ background: rep.status === 'active' ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : '#9ca3af' }}>
                    {rep.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{rep.name}</div>
                    <div className="text-[0.62rem] text-muted-foreground">{rep.district}</div>
                  </div>
                  <Badge variant={rep.status === 'active' ? 'success' : 'muted'}>{rep.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
