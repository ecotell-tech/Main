/**
 * CropMasterPage — Leadership (Manager)
 * Screen 37: Crop catalog management with add/edit/deactivate + CSV import
 */
import { useState, useMemo, useEffect } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { PaginationBar } from '@hooks/usePagination';
import { useToast } from '@hooks/useToast';
import { getCrops, createCrop, updateCrop } from '@services/masterService';
import { ApiError } from '@services/api';

const CATEGORIES = ['Cash Crop', 'Vegetable', 'Oilseed', 'Horticulture', 'Cereal', 'Spice', 'Pulse', 'Other'];
const SEASONS     = ['Kharif', 'Rabi', 'Zaid', 'Perennial', 'Kharif / Rabi'];

const EMPTY_FORM = { name: '', category: '', season: '', isActive: true };

export default function CropMasterPage() {
  const { showToast } = useToast();
  const [crops,   setCrops]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [fCat,    setFCat]    = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [modal,   setModal]   = useState(null); // null | 'add' | 'edit'
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [editId,  setEditId]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [cropPage, setCropPage] = useState(1);
  const CROP_PAGE_SIZE = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCrops();
        if (!cancelled) setCrops(data);
      } catch {
        if (!cancelled) showToast('Failed to load crop master.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return crops.filter(c => {
      if (fCat    !== 'all' && c.category !== fCat) return false;
      if (fStatus !== 'all' && (c.isActive ? 'active' : 'inactive') !== fStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.category ?? '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [crops, search, fCat, fStatus]);

  useEffect(() => setCropPage(1), [filtered]);
  const cropTotalPages = Math.max(1, Math.ceil(filtered.length / CROP_PAGE_SIZE));
  const pagedCrops     = filtered.slice((cropPage - 1) * CROP_PAGE_SIZE, cropPage * CROP_PAGE_SIZE);

  function openAdd() {
    setForm(EMPTY_FORM); setEditId(null); setModal('add');
  }

  function openEdit(crop) {
    setForm({ name: crop.name, category: crop.category ?? '', season: crop.season ?? '', isActive: crop.isActive });
    setEditId(crop.id); setModal('edit');
  }

  async function handleSave() {
    if (!form.name.trim())     { showToast('Crop name is required.',     'error'); return; }
    if (!form.category)         { showToast('Category is required.',      'error'); return; }
    if (!form.season)           { showToast('Season is required.',        'error'); return; }

    setSaving(true);
    try {
      if (modal === 'add') {
        const created = await createCrop(form);
        setCrops(prev => [...prev, created]);
        showToast(`"${form.name}" added to crop master.`, 'success');
      } else {
        const updated = await updateCrop(editId, form);
        setCrops(prev => prev.map(c => c.id === editId ? updated : c));
        showToast(`"${form.name}" updated.`, 'success');
      }
      setModal(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save crop. Please try again.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id) {
    const crop = crops.find(c => c.id === id);
    if (!crop) return;
    const nextActive = !crop.isActive;
    try {
      const updated = await updateCrop(id, { isActive: nextActive });
      setCrops(prev => prev.map(c => c.id === id ? updated : c));
      showToast(`${crop.name} marked as ${nextActive ? 'active' : 'inactive'}.`, nextActive ? 'success' : 'info');
    } catch {
      showToast('Failed to update crop status.', 'error');
    }
  }

  const inputCls = 'w-full h-9 px-3 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const selCls   = inputCls + ' pr-8 appearance-none';

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Crop Master</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the crop catalog used across farmer registrations and plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <i className="fas fa-file-csv mr-2 text-green-600" /> Import CSV
          </Button>
          <Button variant="primary" onClick={openAdd}>
            <i className="fas fa-plus mr-2" /> Add Crop
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Crops',   value: crops.length,                                  color: '#2563eb', icon: 'fas fa-wheat-awn' },
          { label: 'Active',        value: crops.filter(c => c.isActive).length,          color: '#16a34a', icon: 'fas fa-circle-check' },
          { label: 'Inactive',      value: crops.filter(c => !c.isActive).length,         color: '#9ca3af', icon: 'fas fa-circle-pause' },
          { label: 'Categories',    value: new Set(crops.map(c => c.category)).size,       color: '#7c3aed', icon: 'fas fa-tags' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl bg-muted/40 border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <i className={`${icon} text-xs`} style={{ color }} />
              <span className="text-[0.62rem] text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-card rounded-xl border border-border p-3 shadow-sm">
        <div className="relative flex-1 min-w-[10rem]">
          <i className="fas fa-search text-[0.6rem] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="text" placeholder="Search crops…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-7 pr-3 text-xs rounded-lg border border-input bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="relative">
          <select value={fCat} onChange={e => setFCat(e.target.value)} className="h-8 pl-3 pr-7 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none appearance-none">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="h-8 pl-3 pr-7 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-none appearance-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Crop Name', 'Category', 'Season', 'Assigned Farms', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedCrops.map(crop => (
                <tr key={crop.id} className={`hover:bg-muted/10 transition-colors ${!crop.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                        <i className="fas fa-wheat-awn text-green-600 text-[0.65rem]" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{crop.name}</div>
                        <div className="text-[0.58rem] text-muted-foreground">#{crop.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{crop.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{crop.season}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{crop.farmsCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={crop.isActive ? 'success' : 'muted'}>
                      {crop.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(crop)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[0.65rem] font-semibold">
                        <i className="fas fa-pen mr-1" />Edit
                      </button>
                      <button onClick={() => toggleStatus(crop.id)}
                        className={`px-2.5 py-1 rounded-lg text-[0.65rem] font-semibold transition-colors ${crop.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {crop.isActive ? <><i className="fas fa-circle-pause mr-1" />Deactivate</> : <><i className="fas fa-circle-play mr-1" />Activate</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <i className="fas fa-spinner fa-spin text-2xl opacity-40" />
            <span className="text-sm">Loading crops…</span>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
            <i className="fas fa-wheat-awn text-3xl opacity-25" />
            <span className="text-sm">No crops found</span>
          </div>
        )}
        <PaginationBar
          stats={{ total: filtered.length, pages: cropTotalPages, safePage: cropPage,
            start: filtered.length === 0 ? 0 : (cropPage - 1) * CROP_PAGE_SIZE + 1,
            end: Math.min(cropPage * CROP_PAGE_SIZE, filtered.length) }}
          pageNumbers={Array.from({ length: cropTotalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === cropTotalPages || Math.abs(p - cropPage) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])}
          page={cropPage} setPage={setCropPage} label="crops"
        />
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="text-base font-extrabold text-foreground">{modal === 'add' ? 'Add New Crop' : 'Edit Crop'}</div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <i className="fas fa-xmark text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Crop Name *', key: 'name', type: 'text', placeholder: 'e.g. Tomato' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Category *</label>
                <div className="relative">
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selCls}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Season *</label>
                <div className="relative">
                  <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} className={selCls}>
                    <option value="">Select season…</option>
                    {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <i className="fas fa-chevron-down text-[0.55rem] text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Status</label>
                <div className="flex gap-3">
                  {[{ value: true, label: 'active' }, { value: false, label: 'inactive' }].map(s => (
                    <label key={s.label} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" checked={form.isActive === s.value}
                        onChange={() => setForm(f => ({ ...f, isActive: s.value }))} className="accent-blue-600" />
                      <span className="text-xs text-foreground capitalize">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
                  : <><i className="fas fa-save mr-2" />{modal === 'add' ? 'Add Crop' : 'Save Changes'}</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
