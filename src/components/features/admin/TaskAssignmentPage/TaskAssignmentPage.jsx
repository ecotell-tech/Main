/**
 * TaskAssignmentPage — Organic Farming Manager
 * Screen 34: Batch-assign farmers to representatives with workload view
 */
import { useState, useMemo, useCallback } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { useToast } from '@hooks/useToast';
import MOCK_FARMERS from '@data/mock/farmers.json';
import MOCK_REPS    from '@data/mock/representatives.json';

const BAND = (s) =>
  s >= 70 ? { label: 'High',   variant: 'success', color: '#16a34a' }
: s >= 40 ? { label: 'Medium', variant: 'warning', color: '#d97706' }
:           { label: 'Low',    variant: 'danger',  color: '#ef4444' };

const DISTRICTS = [...new Set(MOCK_FARMERS.map(f => f.district))].sort();
const CROPS     = [...new Set(MOCK_FARMERS.map(f => f.crop))].sort();

export default function TaskAssignmentPage() {
  const { showToast } = useToast();

  /* Farmer list + selection */
  const [selected,     setSelected]     = useState(new Set());
  const [assignToRep,  setAssignToRep]  = useState('');
  const [dueDate,      setDueDate]      = useState('');

  /* Filters */
  const [fDistrict, setFDistrict] = useState('all');
  const [fCrop,     setFCrop]     = useState('all');
  const [fBand,     setFBand]     = useState('all');
  const [fSearch,   setFSearch]   = useState('');
  const [fUnassigned, setFUnassigned] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_FARMERS.filter(f => {
      if (fDistrict !== 'all' && f.district !== fDistrict) return false;
      if (fCrop     !== 'all' && f.crop     !== fCrop)     return false;
      if (fBand !== 'all') {
        const b = BAND(f.adoptionScore).label.toLowerCase();
        if (b !== fBand) return false;
      }
      if (fUnassigned && f.repId) return false;
      if (fSearch) {
        const q = fSearch.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.village.toLowerCase().includes(q);
      }
      return true;
    });
  }, [fDistrict, fCrop, fBand, fSearch, fUnassigned]);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(f => f.id)));
    }
  }

  function handleAssign() {
    if (selected.size === 0) { showToast('Select at least one farmer.', 'error'); return; }
    if (!assignToRep)         { showToast('Select a representative.', 'error');   return; }
    const rep = MOCK_REPS.find(r => r.id === assignToRep);
    showToast(`${selected.size} farmer(s) assigned to ${rep?.name ?? 'rep'}${dueDate ? ` · Due ${dueDate}` : ''}.`, 'success');
    setSelected(new Set());
    setAssignToRep('');
    setDueDate('');
  }

  /* Workload per rep */
  const workload = useMemo(() => {
    return MOCK_REPS.map(rep => {
      const count = MOCK_FARMERS.filter(f => f.repId === rep.id).length;
      return { ...rep, count };
    }).sort((a, b) => b.count - a.count);
  }, []);
  const maxLoad = Math.max(...workload.map(r => r.count), 1);

  const inputCls = 'h-8 px-3 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const selectCls = 'h-8 pl-3 pr-7 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground font-heading">Task Assignment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Select farmers, choose a representative and optionally set a due date</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Farmer selection panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filters */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <i className="fas fa-filter text-xs text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Filter Farmers</span>
              {selected.size > 0 && (
                <Badge variant="info" className="ml-auto">{selected.size} selected</Badge>
              )}
            </div>
            <div className="relative">
              <i className="fas fa-search text-xs text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text" placeholder="Search name or village…"
                value={fSearch} onChange={e => setFSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs rounded-lg border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="relative">
                <select value={fDistrict} onChange={e => setFDistrict(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="all">All Districts</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={fCrop} onChange={e => setFCrop(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="all">All Crops</option>
                  {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={fBand} onChange={e => setFBand(e.target.value)} className={selectCls + ' w-full'}>
                  <option value="all">All Bands</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer px-2">
                <input type="checkbox" checked={fUnassigned} onChange={e => setFUnassigned(e.target.checked)} className="accent-blue-600 w-4 h-4" />
                Unassigned only
              </label>
            </div>
          </div>

          {/* Farmer table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <input type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  className="accent-blue-600 w-4 h-4" />
                <span className="text-xs font-bold text-foreground">{filtered.length} farmers</span>
              </div>
              {selected.size > 0 && (
                <Button variant="ghost" onClick={() => setSelected(new Set())} className="text-xs text-red-500 h-6 px-2">
                  Clear selection
                </Button>
              )}
            </div>
            <div className="divide-y divide-border max-h-[28rem] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <i className="fas fa-users text-2xl opacity-25" />
                  <span className="text-sm">No farmers match the filters</span>
                </div>
              )}
              {filtered.map(f => {
                const b = BAND(f.adoptionScore);
                const isSel = selected.has(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleSelect(f.id)}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${isSel ? 'bg-blue-50' : 'hover:bg-muted/20'}`}
                  >
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(f.id)}
                      onClick={e => e.stopPropagation()} className="accent-blue-600 w-4 h-4 shrink-0" />
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                      style={{ background: f.avatarGradient }}>
                      {f.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{f.name}</div>
                      <div className="text-[0.62rem] text-muted-foreground truncate">{f.village} · {f.district} · {f.crop}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-xs font-bold px-2 py-0.5 rounded-full border"
                        style={{ color: b.color, background: b.color + '15', borderColor: b.color + '40' }}>
                        {f.adoptionScore}
                      </div>
                      {f.repName ? (
                        <span className="text-[0.6rem] text-muted-foreground hidden sm:block">{f.repName.split(' ')[0]}</span>
                      ) : (
                        <Badge variant="warning" className="text-[0.6rem]">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Assignment form */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">Assign Task</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Representative *</label>
                <div className="relative">
                  <select value={assignToRep} onChange={e => setAssignToRep(e.target.value)} className={selectCls + ' w-full h-10'}>
                    <option value="">Select representative…</option>
                    {MOCK_REPS.filter(r => r.status === 'active').map(r => (
                      <option key={r.id} value={r.id}>{r.name} · {r.territory}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Due Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className={inputCls + ' w-full h-10'} />
              </div>
              <div className="pt-1">
                <div className="text-[0.65rem] text-muted-foreground mb-3">
                  {selected.size > 0
                    ? <><span className="font-bold text-foreground">{selected.size}</span> farmer(s) selected for assignment</>
                    : 'Select farmers from the list on the left'}
                </div>
                <Button variant="primary" className="w-full" onClick={handleAssign} disabled={selected.size === 0 || !assignToRep}>
                  <i className="fas fa-user-plus mr-2" /> Assign {selected.size > 0 ? `${selected.size} Farmer${selected.size > 1 ? 's' : ''}` : ''}
                </Button>
              </div>
            </div>
          </div>

          {/* Workload distribution */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <span className="text-sm font-bold text-foreground">Rep Workload</span>
            </div>
            <div className="p-4 space-y-3">
              {workload.map(rep => {
                const pct = Math.round((rep.count / maxLoad) * 100);
                const busy = pct > 80;
                return (
                  <div key={rep.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate mr-2">{rep.name.split(' ')[0]}</span>
                      <span className={`font-bold ${busy ? 'text-red-500' : 'text-muted-foreground'}`}>{rep.count} farmers</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: busy ? '#ef4444' : '#2563eb' }} />
                    </div>
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
