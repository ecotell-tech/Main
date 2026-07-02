import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmers, rejectFarmer } from '@services/farmerService';
import { useTableFilter }           from '@hooks/useTableFilter';
import { useModal }                 from '@hooks/useModal';
import { useAuth }                  from '@context/AuthContext';
import { useToast }                 from '@hooks/useToast';
import FarmersTable                 from '@features/farmers/FarmersTable/FarmersTable';
import VisitLogModal                from '@features/modals/VisitLogModal/VisitLogModal';
import Button                       from '@common/Button/Button';
import { ROUTES }                   from '@constants/routes';

const SEARCH_FIELDS = ['name', 'village', 'district', 'crop'];
const FILTER_DEFS   = { crop: 'crop', status: 'planStatus' };

const bandOf = (score) =>
  score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

const TABS = [
  { id: 'all',      label: 'All Farmers',      icon: 'fas fa-users',              color: '#6b7280', bg: '#f3f4f6', desc: 'All assigned farmers' },
  { id: 'high',     label: 'High Readiness',   icon: 'fas fa-circle-check',       color: '#16a34a', bg: '#f0fdf4', desc: 'Adoption score ≥ 70 — ready for full plan rollout' },
  { id: 'medium',   label: 'Medium Readiness', icon: 'fas fa-circle-half-stroke', color: '#d97706', bg: '#fffbeb', desc: 'Adoption score 40–69 — needs follow-up' },
  { id: 'low',      label: 'Low Readiness',    icon: 'fas fa-circle-exclamation', color: '#ef4444', bg: '#fef2f2', desc: 'Adoption score < 40 — requires intervention' },
];

const REJECTED_TAB = { id: 'rejected', label: 'Rejected', icon: 'fas fa-times-circle', color: '#dc2626', bg: '#fff1f2', desc: 'Rejected by team lead — edit and resubmit' };

export default function FarmersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [farmers, setFarmers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const visitModal                = useModal();
  const navigate                  = useNavigate();
  const { currentUser }           = useAuth();
  const { showToast }             = useToast();
  const role                      = currentUser?.role ?? '';

  // Rejection modal state
  const [rejectTarget,  setRejectTarget]  = useState(null); // farmer being rejected
  const [rejectReason,  setRejectReason]  = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getFarmers({ limit: 500 })
      .then(res => setFarmers(res.farmers))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const bandFiltered = useMemo(() => {
    if (activeTab === 'all')      return farmers;
    if (activeTab === 'rejected') return farmers.filter(f => f.reviewStatus === 'rejected');
    return farmers.filter(f => bandOf(f.adoptionScore) === activeTab);
  }, [activeTab, farmers]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const { filtered, searchQuery, setSearchQuery, filterValues, setFilterValue } =
    useTableFilter(bandFiltered, SEARCH_FIELDS, FILTER_DEFS);

  const counts = useMemo(() => ({
    all:      farmers.length,
    high:     farmers.filter(f => bandOf(f.adoptionScore) === 'high').length,
    medium:   farmers.filter(f => bandOf(f.adoptionScore) === 'medium').length,
    low:      farmers.filter(f => bandOf(f.adoptionScore) === 'low').length,
    rejected: farmers.filter(f => f.reviewStatus === 'rejected').length,
  }), [farmers]);

  useEffect(() => setPage(1), [filtered]);

  const pagedFarmers = useMemo(() =>
    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  [filtered, page]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const isTeamLead  = role === 'team_lead' || role === 'supervisor';
  const isRep       = role === 'agronomist' || role === 'data_entry_operator';
  const displayTabs = isRep ? [...TABS, REJECTED_TAB] : TABS;
  const currentTab  = displayTabs.find(t => t.id === activeTab);

  // ── Rejection handlers ──────────────────────────────────────
  function handleRejectClick(farmer) {
    setRejectTarget(farmer);
    setRejectReason('');
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await rejectFarmer(rejectTarget.id, rejectReason.trim() || null);
      showToast(`Registration of "${rejectTarget.name}" rejected.`, 'success');
      setRejectTarget(null);
      setRejectReason('');
      load(); // refresh list
    } catch (err) {
      showToast(err?.message || 'Failed to reject. Try again.', 'error');
    } finally {
      setRejectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground gap-3">
        <i className="fas fa-circle-notch fa-spin text-lg" />
        <span className="text-sm">Loading farmers…</span>
      </div>
    );
  }

  return (
    <div id="page-farmers" className="space-y-5">

      {/* Section header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-foreground font-heading">
            {isTeamLead ? 'Registered Farmers' : 'My Farmers'}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {farmers.length} farmers {isTeamLead ? 'registered by your team' : 'assigned'}
            {activeTab === 'rejected'
              ? ` — ${counts.rejected} need re-editing`
              : ' — filtered by adoption readiness'}
          </div>
        </div>
        {!isTeamLead && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.abs.importFarmers)} className="shrink-0">
              <i className="fas fa-file-import mr-2" aria-hidden="true" /> Import
            </Button>
            <Button variant="outline" onClick={visitModal.openModal} className="shrink-0">
              <i className="fas fa-map-marker-alt" aria-hidden="true" /> Log Visit
            </Button>
          </div>
        )}
      </div>

      {/* Readiness tab strip */}
      <div className={`grid gap-3 ${isRep ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {displayTabs.map(({ id, label, icon, color, bg, desc }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md ${active ? 'shadow-md' : 'border-border bg-card hover:border-gray-300'}`}
              style={active ? { borderColor: color, background: bg } : {}}
            >
              <div className="flex items-center gap-2 mb-2">
                <i className={`${icon} text-sm`} style={{ color: active ? color : '#9ca3af' }} />
                <span className="text-[0.68rem] font-semibold" style={{ color: active ? color : '#6b7280' }}>
                  {label}
                </span>
              </div>
              <div className="text-2xl font-extrabold" style={{ color: active ? color : '#374151' }}>
                {counts[id]}
              </div>
              <div className="text-[0.6rem] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{desc}</div>
            </button>
          );
        })}
      </div>

      {activeTab !== 'all' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium"
          style={{ background: currentTab.bg, color: currentTab.color, border: `1px solid ${currentTab.color}30` }}>
          <i className={currentTab.icon} />
          <span>Showing <strong>{counts[activeTab]}</strong> {currentTab.label} farmers — {currentTab.desc}</span>
          <button className="ml-auto underline underline-offset-2 font-semibold" onClick={() => setActiveTab('all')}>
            Show All
          </button>
        </div>
      )}

      <FarmersTable
        farmers={pagedFarmers}
        role={role}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cropFilter={filterValues.crop ?? ''}
        onCropChange={(val) => setFilterValue('crop', val)}
        statusFilter={filterValues.status ?? ''}
        onStatusChange={(val) => setFilterValue('status', val)}
        totalCount={bandFiltered.length}
        pageSize={PAGE_SIZE}
        onLogVisit={visitModal.openModal}
        onReject={handleRejectClick}
      />

      <VisitLogModal
        isOpen={visitModal.isOpen}
        onClose={visitModal.closeModal}
        onSave={visitModal.closeModal}
      />

      {/* Rejection confirmation modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <i className="fas fa-times-circle text-red-600" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">Reject Registration</div>
                <div className="text-xs text-muted-foreground">
                  The representative will see this rejection and can re-edit the record.
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-muted/50 rounded-xl text-sm">
              <span className="font-semibold">{rejectTarget.name}</span>
              <span className="text-muted-foreground"> — registered by </span>
              <span className="font-medium">{rejectTarget.repName}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-foreground">
                Reason for rejection <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                placeholder="e.g. Incomplete farm details, invalid mobile number…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
              />
              <div className="text-[0.65rem] text-muted-foreground mt-0.5 text-right">
                {rejectReason.length}/500
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                disabled={rejectLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={rejectLoading}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                {rejectLoading
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Rejecting…</>
                  : <><i className="fas fa-times-circle mr-2" />Reject Registration</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
