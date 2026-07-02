import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { useAuth }                           from '@context/AuthContext';
import { useFormConfig }                     from '@context/FormConfigContext';
import { getFarmerById, uploadFarmerPhotos }  from '@services/farmerService';
import Badge                                 from '@common/Badge/Badge';
import Button                                from '@common/Button/Button';
import VisitLogModal                         from '@features/modals/VisitLogModal/VisitLogModal';

/* â”€â”€â”€ Role-based visibility gates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CAN_SEE_FIELD_DETAILS = ['agronomist', 'team_lead', 'supervisor', 'admin', 'manager'];
const CAN_SEE_SENSITIVE     = ['admin', 'manager', 'team_lead', 'supervisor'];
const CAN_SEE_AUDIT         = ['admin', 'manager', 'team_lead', 'supervisor'];

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const bandOf = (score) =>
  score >= 70
    ? { label: 'High Readiness',   color: '#16a34a', bg: '#f0fdf4', ring: '#bbf7d0', icon: 'fas fa-circle-check'       }
  : score >= 40
    ? { label: 'Medium Readiness', color: '#d97706', bg: '#fffbeb', ring: '#fde68a', icon: 'fas fa-circle-half-stroke' }
    : { label: 'Low Readiness',    color: '#ef4444', bg: '#fef2f2', ring: '#fecaca', icon: 'fas fa-circle-exclamation'  };

const PLAN_VARIANT  = { active: 'success', pending: 'warning', completed: 'info' };
const COMP_META     = {
  irrigation:   { icon: 'fas fa-droplet',   label: 'Irrigation',    color: '#2563eb' },
  fertilizer:   { icon: 'fas fa-seedling',  label: 'Fertilizer',    color: '#16a34a' },
  spray:        { icon: 'fas fa-spray-can', label: 'Spray',         color: '#d97706' },
  cropAdvisory: { icon: 'fas fa-wheat-awn', label: 'Crop Advisory', color: '#92400e' },
};
const COMP_STATUS   = {
  done:    { variant: 'success', label: 'Completed', icon: 'fas fa-check-circle', color: '#16a34a' },
  active:  { variant: 'warning', label: 'Ongoing',   icon: 'fas fa-circle-dot',   color: '#d97706' },
  pending: { variant: 'muted',   label: 'Pending',   icon: 'fas fa-clock',        color: '#9ca3af' },
};
const FARMING_LABEL  = { chemical: 'Chemical', natural: 'Natural', organic: 'Organic', mixed: 'Mixed' };
const LAND_OWN_LABEL = { owned: 'Owned', leased: 'Leased', share_cropped: 'Share Cropped', other: 'Other' };
const ROLE_LABEL    = {
  agronomist:          'Field Representative',
  team_lead:           'Team Lead',
  supervisor:          'Team Lead',
  admin:               'Manager',
  data_entry_operator: 'Data Entry Operator',
  manager:             'Leadership',
};
const PHOTO_TAG_ICON  = { field: 'fas fa-mountain-sun', irrigation: 'fas fa-droplet', soil: 'fas fa-layer-group', compost: 'fas fa-recycle', storage: 'fas fa-warehouse', infrastructure: 'fas fa-building', fertilizer: 'fas fa-seedling', visit: 'fas fa-user-check' };
const PHOTO_TAG_COLOR = { field: '#16a34a', irrigation: '#2563eb', soil: '#92400e', compost: '#0d9488', storage: '#7c3aed', infrastructure: '#6b7280', fertilizer: '#d97706', visit: '#e11d48' };

/* â”€â”€â”€ Shared sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SectionCard({ title, icon, iconColor, badge, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <i className={`${icon} text-sm`} style={{ color: iconColor ?? '#6b7280' }} />
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, iconColor, mono }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/60">
        <i className={`${icon} text-sm`} style={{ color: iconColor ?? '#6b7280' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.63rem] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">{label}</div>
        <div className={`text-sm font-semibold text-foreground break-all ${mono ? 'font-mono tracking-wider' : ''}`}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function AccessDeniedBox({ label }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/40 border border-dashed border-border text-xs text-muted-foreground">
      <i className="fas fa-lock opacity-40" />
      <span>{label}</span>
    </div>
  );
}

/* â”€â”€â”€ MAIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* ─── Photo section ──────────────────────────────────────────────────────── */
const PHOTO_SLOTS = [
  { key: 'farmer', label: 'Farmer Portrait', icon: 'fas fa-user',         color: '#e11d48' },
  { key: 'land',   label: 'Land / Field',    icon: 'fas fa-mountain-sun', color: '#16a34a' },
  { key: 'well',   label: 'Well / Borewell', icon: 'fas fa-droplet',      color: '#2563eb' },
  { key: 'soil',   label: 'Soil Sample',     icon: 'fas fa-layer-group',  color: '#92400e' },
  { key: 'house',  label: 'House / Farm',    icon: 'fas fa-house',        color: '#7c3aed' },
];

function PhotoSection({ photos, farmerId, onUploaded }) {
  const [pending,    setPending]    = useState({});   // key → File
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState(null);

  const byType = Object.fromEntries(photos.map(p => [p.tag, p]));

  function pickFile(key, file) {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are accepted.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Each photo must be under 3 MB.');
      return;
    }
    setError(null);
    setPending(prev => ({ ...prev, [key]: file }));
  }

  async function handleSave() {
    if (!Object.keys(pending).length) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFarmerPhotos(farmerId, pending);
      setPending({});
      // Refresh the photo list from the returned saved types
      if (result.saved?.length) {
        const res = await import('@services/farmerService').then(m => m.getFarmerById(farmerId));
        if (res?.farmPhotos) onUploaded(res.farmPhotos);
      }
    } catch (err) {
      setError(err?.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

  const hasPending = Object.keys(pending).length > 0;

  return (
    <SectionCard
      title="Field Photographs"
      icon="fas fa-camera"
      iconColor="#e11d48"
      badge={photos.length > 0 && <Badge variant="info">{photos.length} photo{photos.length !== 1 ? 's' : ''}</Badge>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PHOTO_SLOTS.map(({ key, label, icon, color }) => {
          const saved   = byType[key];
          const preview = pending[key] ? URL.createObjectURL(pending[key]) : null;
          const imgUrl  = preview ?? saved?.url ?? null;

          return (
            <label key={key} className="group cursor-pointer rounded-xl border border-border overflow-hidden bg-muted/30 hover:shadow-md transition-shadow block">
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="sr-only"
                onChange={e => pickFile(key, e.target.files?.[0])} />

              {/* Image or placeholder */}
              {imgUrl ? (
                <div className="relative">
                  <img src={imgUrl} alt={label}
                    className="h-28 w-full object-cover group-hover:brightness-90 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-t-xl">
                    <i className="fas fa-pencil text-white text-lg" />
                  </div>
                </div>
              ) : (
                <div className="h-28 flex flex-col items-center justify-center gap-2"
                  style={{ background: `${color}12`, borderBottom: `2px solid ${color}25` }}>
                  <i className={`${icon} text-2xl`} style={{ color, opacity: 0.55 }} />
                  <span className="text-[0.58rem] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `${color}18`, color }}>Add Photo</span>
                </div>
              )}

              {/* Caption row */}
              <div className="p-2 text-center">
                <div className="text-[0.65rem] font-semibold text-foreground leading-tight truncate">{label}</div>
                {saved && !preview && (
                  <div className="text-[0.58rem] text-muted-foreground mt-0.5">{saved.date}</div>
                )}
                {preview && (
                  <div className="text-[0.58rem] text-amber-600 mt-0.5 font-semibold">Not saved yet</div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <i className="fas fa-circle-exclamation" /> {error}
        </div>
      )}

      {hasPending && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {Object.keys(pending).length} photo{Object.keys(pending).length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setPending({}); setError(null); }}>
              Discard
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={uploading}>
              {uploading ? <><i className="fas fa-spinner fa-spin mr-1.5" />Uploading…</> : 'Save Photos'}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ─── Plan slide-over drawer ─────────────────────────────────────────────── */
const INTEREST_LABEL    = { high: 'High', medium: 'Medium', low: 'Low' };
const WILLINGNESS_LABEL = { very_willing: 'Very Willing', moderate: 'Moderate', not_willing: 'Not Willing' };
const PRIORITY_COLOR    = { high: '#ef4444', medium: '#d97706', low: '#16a34a' };
const INTEREST_COLOR    = { high: '#16a34a', medium: '#d97706', low: '#ef4444' };

function PlanDrawer({ farmer, band, compEntries, doneCount, pct, onClose, onLogVisit }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const priorityColor = PRIORITY_COLOR[farmer.priority]       ?? '#6b7280';
  const interestColor = INTEREST_COLOR[farmer.interest_level] ?? '#6b7280';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-label="Full Consulting Plan"
        className="fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight 0.22s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0"
          style={{ background: farmer.avatarGradient }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-base font-extrabold shrink-0">
              {farmer.initials}
            </div>
            <div>
              <p className="text-sm font-extrabold text-white leading-tight">{farmer.name}</p>
              <p className="text-xs text-white/70 font-mono">{farmer.farmer_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={PLAN_VARIANT[farmer.planStatus]}>
              {farmer.planStatus.charAt(0).toUpperCase() + farmer.planStatus.slice(1)}
            </Badge>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              aria-label="Close plan">
              <i className="fas fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Overview tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: 'fas fa-chart-line',    label: 'Adoption Score', value: `${farmer.adoptionScore}/100`, color: band.color, bg: band.bg },
              { icon: 'fas fa-tasks',         label: 'Plan Progress',  value: `${pct}%`, color: pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#ef4444', bg: '#f8fafc' },
              { icon: 'fas fa-calendar-check',label: 'Last Visit',     value: farmer.lastVisit ?? '—', color: '#2563eb', bg: '#eff6ff' },
            ].map(({ icon, label, value, color, bg }) => (
              <div key={label} className="rounded-xl p-3 border border-border text-center" style={{ background: bg }}>
                <i className={`${icon} text-base mb-1 block`} style={{ color }} />
                <div className="text-sm font-extrabold" style={{ color }}>{value}</div>
                <div className="text-[0.6rem] text-muted-foreground mt-0.5 leading-tight">{label}</div>
              </div>
            ))}
          </div>

          {/* Completion bar */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold text-foreground">Overall Completion</span>
              <span className="font-bold text-foreground">{doneCount} / {compEntries.length} done</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }} />
            </div>
          </div>

          {/* Plan Components */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-2">
              <i className="fas fa-list-check text-green-600" /> Plan Components
            </p>
            {compEntries.length > 0 ? (
              <div className="space-y-2">
                {compEntries.map(([key, status]) => {
                  const meta = COMP_META[key]      ?? { icon: 'fas fa-circle', label: key, color: '#6b7280' };
                  const st   = COMP_STATUS[status] ?? COMP_STATUS.pending;
                  return (
                    <div key={key} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-white hover:bg-muted/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
                        <i className={`${meta.icon} text-sm`} style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                        <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                          <i className={`${st.icon} mr-1`} style={{ color: st.color }} />{st.label}
                        </div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: st.color }} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground rounded-xl border border-dashed border-border bg-muted/20">
                <i className="fas fa-clipboard-list text-2xl opacity-30" />
                <p className="text-xs">No plan components assigned yet</p>
              </div>
            )}
          </div>

          {/* Readiness Assessment */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-2">
              <i className="fas fa-gauge-high text-amber-600" /> Readiness Assessment
            </p>
            <div className="space-y-2.5">
              {[
                { icon: 'fas fa-fire-flame-curved', label: 'Interest Level',       value: INTEREST_LABEL[farmer.interest_level]       ?? farmer.interest_level       ?? '—', color: interestColor },
                { icon: 'fas fa-chalkboard-user',   label: 'Training Willingness', value: WILLINGNESS_LABEL[farmer.training_willingness] ?? farmer.training_willingness ?? '—', color: '#7c3aed' },
                { icon: 'fas fa-calendar-days',     label: 'Adoption Timeline',    value: farmer.adoption_timeline ?? '—',                                                      color: '#2563eb' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl p-3 bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                    <i className={`${icon} text-xs`} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">{label}</div>
                    <div className="text-xs font-semibold text-foreground">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement & Actions */}
          <div>
            <p className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-2">
              <i className="fas fa-bullseye text-blue-600" /> Engagement & Next Steps
            </p>
            <div className="space-y-2.5">
              {farmer.priority && (
                <div className="flex items-center justify-between rounded-xl p-3 border border-border bg-white">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${priorityColor}15` }}>
                      <i className="fas fa-flag text-xs" style={{ color: priorityColor }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Priority</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: priorityColor }}>
                    {farmer.priority.charAt(0).toUpperCase() + farmer.priority.slice(1)}
                  </span>
                </div>
              )}
              {farmer.next_action && (
                <div className="rounded-xl p-3.5 border border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-circle-arrow-right text-blue-600 text-sm mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[0.6rem] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Next Action</div>
                      <p className="text-xs text-blue-900 leading-relaxed">{farmer.next_action}</p>
                    </div>
                  </div>
                </div>
              )}
              {farmer.followup_date && (
                <div className="flex items-center gap-3 rounded-xl p-3 bg-amber-50 border border-amber-200">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <i className="fas fa-calendar-plus text-amber-600 text-xs" />
                  </div>
                  <div>
                    <div className="text-[0.6rem] text-amber-700 uppercase tracking-wide">Follow-up Date</div>
                    <div className="text-xs font-semibold text-amber-900">{farmer.followup_date}</div>
                  </div>
                </div>
              )}
              {farmer.consult_notes && (
                <div className="rounded-xl p-3.5 border border-border bg-muted/30">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-note-sticky text-muted-foreground text-sm mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Consulting Notes</div>
                      <p className="text-xs text-foreground leading-relaxed">{farmer.consult_notes}</p>
                    </div>
                  </div>
                </div>
              )}
              {!farmer.priority && !farmer.next_action && !farmer.followup_date && !farmer.consult_notes && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground rounded-xl border border-dashed border-border bg-muted/20">
                  <i className="fas fa-clipboard-question text-2xl opacity-30" />
                  <p className="text-xs">No engagement actions recorded yet</p>
                </div>
              )}
            </div>
          </div>

          {farmer.referred_by && (
            <div className="flex items-center gap-3 rounded-xl p-3 border border-border bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <i className="fas fa-user-group text-muted-foreground text-xs" />
              </div>
              <div>
                <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">Referred By</div>
                <div className="text-xs font-semibold text-foreground">{farmer.referred_by}</div>
              </div>
            </div>
          )}

          {/* Next visit tile */}
          <div className="rounded-xl border border-border p-4 flex items-center gap-4 bg-white">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <i className="fas fa-calendar-plus text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">Next Scheduled Visit</div>
              <div className="text-sm font-bold text-foreground mt-0.5">
                {farmer.nextVisit && farmer.nextVisit !== '—' ? farmer.nextVisit : 'Not yet scheduled'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex items-center gap-3 shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onLogVisit}>
            <i className="fas fa-calendar-plus mr-2" /> Log a Visit
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default function FarmerDetailPage() {
  const { farmerId }    = useParams();
  const navigate        = useNavigate();
  const { currentUser } = useAuth();

  const [farmer,    setFarmer]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [planOpen,  setPlanOpen]  = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  const handleClosePlan = useCallback(() => setPlanOpen(false), []);

  useEffect(() => {
    getFarmerById(farmerId)
      .then(data => setFarmer(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [farmerId]);

  const { getAllExtendedFields } = useFormConfig();

  const role = currentUser?.role ?? '';
  const canFieldDetails = CAN_SEE_FIELD_DETAILS.includes(role);
  const canSensitive    = CAN_SEE_SENSITIVE.includes(role);
  const canAudit        = CAN_SEE_AUDIT.includes(role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <i className="fas fa-circle-notch fa-spin text-2xl" />
        <span className="text-sm">Loading farmer…</span>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <i className="fas fa-circle-exclamation text-4xl text-red-400" />
        <div className="text-lg font-semibold">Farmer not found</div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left mr-2" /> Back to Farmers
        </Button>
      </div>
    );
  }

  const band        = bandOf(farmer.adoptionScore);
  const compEntries = Object.entries(farmer.components ?? {});
  const doneCount   = compEntries.filter(([, v]) => v === 'done').length;
  const pct         = compEntries.length > 0 ? Math.round((doneCount / compEntries.length) * 100) : 0;
  const farmerVisits = [];

  const SCORE_SEGMENTS = [
    { label: 'Low (0–39)',    w: 40, color: '#ef4444' },
    { label: 'Medium (40–69)', w: 30, color: '#d97706' },
    { label: 'High (70–100)', w: 30, color: '#16a34a' },
  ];

  const LIFECYCLE = [
    { icon: 'fas fa-user-plus',    color: '#2563eb', label: 'Farmer Registered', by: farmer.registeredBy, date: farmer.registrationDate },
    { icon: 'fas fa-map-location', color: '#d97706', label: 'Field Survey Done',  by: farmer.registeredBy, date: farmer.surveyDate       },
    { icon: 'fas fa-circle-check', color: '#7c3aed', label: 'Record Approved',    by: farmer.approvedBy,   date: farmer.approvedDate     },
    { icon: 'fas fa-play-circle',  color: '#16a34a', label: 'Plan Initiated',     by: 'System',            date: farmer.registrationDate },
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <i className="fas fa-arrow-left text-xs" /> Back to Farmers
      </button>

      {/* â•â• HERO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-24 w-full" style={{ background: farmer.avatarGradient }} />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div
                className="w-20 h-20 rounded-2xl border-4 border-card shadow-lg flex items-center justify-center text-white text-2xl font-extrabold shrink-0"
                style={{ background: farmer.avatarGradient }}
              >
                {farmer.initials}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-extrabold text-foreground font-heading leading-tight">{farmer.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">{farmer.farmer_code}</span>
                  <span className="opacity-30 text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">
                    <i className="fas fa-map-pin mr-1 opacity-60" />
                    {farmer.village}, {farmer.district}, {farmer.state}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1 sm:justify-end">
              <Badge variant={PLAN_VARIANT[farmer.planStatus]}>
                <i className="fas fa-circle text-[0.35rem] mr-1 align-middle" />
                {farmer.planStatus.charAt(0).toUpperCase() + farmer.planStatus.slice(1)}
              </Badge>
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ background: band.bg, color: band.color, borderColor: band.ring }}
              >
                <i className={band.icon} />{band.label}
              </div>
            </div>
          </div>

          {/* Quick-stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { icon: 'fas fa-phone',         label: 'Mobile',       value: farmer.mobile,                                      color: '#2563eb' },
              { icon: 'fas fa-seedling',       label: 'Crop',         value: farmer.crop,                                        color: '#16a34a' },
              { icon: 'fas fa-ruler-combined', label: 'Land',         value: farmer.landAcres != null ? `${Number(farmer.landAcres).toFixed(1)} Acres` : '—', color: '#d97706' },
              { icon: 'fas fa-leaf',           label: 'Farming Type', value: FARMING_LABEL[farmer.farmingType] ?? farmer.farmingType, color: '#0d9488' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3 border border-border">
                <div className="flex items-center gap-1.5 mb-1">
                  <i className={`${icon} text-[0.68rem]`} style={{ color }} />
                  <span className="text-[0.6rem] text-muted-foreground uppercase tracking-wide">{label}</span>
                </div>
                <div className="text-sm font-bold text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â•â• Location + Representative â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* Review status banner */}
      {farmer.reviewStatus === 'rejected' && (
        <div className="flex items-start gap-4 px-5 py-4 rounded-2xl border border-red-200 bg-red-50">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <i className="fas fa-times-circle text-red-600 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-700">Registration Rejected</div>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
              {farmer.rejectionReason
                ? farmer.rejectionReason
                : 'The team lead has rejected this registration. Please edit and resubmit.'}
            </p>
          </div>
        </div>
      )}
      {farmer.reviewStatus === 'pending_review' && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-amber-200 bg-amber-50">
          <i className="fas fa-clock text-amber-600" />
          <span className="text-sm font-semibold text-amber-700">Pending team lead review</span>
        </div>
      )}

      {/* Personal & Contact */}
      {(farmer.gender || farmer.dob || farmer.age || farmer.altMobile) && (
        <SectionCard title="Personal & Contact" icon="fas fa-user-circle" iconColor="#e11d48">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {farmer.gender && (
              <InfoRow icon="fas fa-venus-mars" label="Gender"
                value={farmer.gender.charAt(0).toUpperCase() + farmer.gender.slice(1)}
                iconColor="#e11d48" />
            )}
            {farmer.dob && (
              <InfoRow icon="fas fa-cake-candles" label="Date of Birth" value={String(farmer.dob)} iconColor="#d97706" />
            )}
            {farmer.age && (
              <InfoRow icon="fas fa-calendar-days" label="Age" value={`${farmer.age} years`} iconColor="#7c3aed" />
            )}
            {farmer.altMobile && (
              <InfoRow icon="fas fa-phone-flip" label="Alt. Mobile" value={farmer.altMobile} iconColor="#16a34a" />
            )}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Location */}
        <SectionCard title="Location Details" icon="fas fa-map-location-dot" iconColor="#2563eb">
          <div className="space-y-4">
            <InfoRow icon="fas fa-house"   label="Village"  value={farmer.village}  iconColor="#6b7280" />
            <InfoRow icon="fas fa-map-pin" label="Taluka"   value={farmer.taluka}   iconColor="#d97706" />
            <InfoRow icon="fas fa-city"    label="District" value={farmer.district} iconColor="#2563eb" />
            <InfoRow icon="fas fa-flag"    label="State"    value={farmer.state}    iconColor="#7c3aed" />
            {farmer.pinCode && (
              <InfoRow icon="fas fa-location-pin" label="Pin Code" value={farmer.pinCode} iconColor="#6b7280" />
            )}
            {farmer.nearestMandi && (
              <InfoRow icon="fas fa-store" label="Nearest Mandi" value={farmer.nearestMandi} iconColor="#16a34a" />
            )}

            <div className="border-t border-border pt-3">
              {canFieldDetails && farmer.gpsLat ? (
                <>
                  <InfoRow
                    icon="fas fa-location-crosshairs"
                    label="GPS Coordinates"
                    value={`${farmer.gpsLat}° N, ${farmer.gpsLng}° E`}
                    iconColor="#e11d48"
                  />
                  <a
                    href={`https://maps.google.com/?q=${farmer.gpsLat},${farmer.gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 border border-border hover:bg-muted/40 transition-colors text-foreground"
                  >
                    <i className="fas fa-map text-blue-500" /> Open in Google Maps
                    <i className="fas fa-arrow-up-right-from-square text-[0.6rem] opacity-50" />
                  </a>
                </>
              ) : (
                <AccessDeniedBox label="GPS coordinates — visible to field roles and above" />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Representative */}
        <SectionCard title="Assigned Representative" icon="fas fa-user-tie" iconColor="#7c3aed">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}
              >
                {farmer.repName.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{farmer.repName}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {ROLE_LABEL[farmer.submittedByRole] ?? farmer.submittedByRole}
                </div>
                <div className="text-[0.65rem] text-muted-foreground mt-1 font-mono">{farmer.repId}</div>
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <InfoRow icon="fas fa-phone"   label="Rep Mobile" value={farmer.repMobile} iconColor="#16a34a" />
              {canAudit
                ? <InfoRow icon="fas fa-envelope" label="Rep Email" value={farmer.repEmail} iconColor="#2563eb" />
                : <AccessDeniedBox label="Rep email — restricted to supervisors and above" />
              }
            </div>
          </div>
        </SectionCard>
      </div>

      {/* â•â• Farm & Soil Details â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <SectionCard title="Farm & Soil Details" icon="fas fa-tractor" iconColor="#92400e">
        {canFieldDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <InfoRow icon="fas fa-layer-group"    label="Soil Type"          value={farmer.soilType}                                                              iconColor="#92400e" />
            <InfoRow icon="fas fa-faucet"         label="Water Source"       value={farmer.waterSource}                                                           iconColor="#2563eb" />
            <InfoRow icon="fas fa-ruler-combined" label="Total Land"         value={farmer.landAcres != null ? `${Number(farmer.landAcres).toFixed(1)} Acres` : '—'} iconColor="#d97706" />
            {farmer.irrigatedLandAcres != null && (
              <InfoRow icon="fas fa-droplet"       label="Irrigated Land"     value={`${Number(farmer.irrigatedLandAcres).toFixed(1)} Acres`}                     iconColor="#2563eb" />
            )}
            {farmer.nonIrrigatedLandAcres != null && (
              <InfoRow icon="fas fa-sun"           label="Non-Irrigated Land" value={`${Number(farmer.nonIrrigatedLandAcres).toFixed(1)} Acres`}                  iconColor="#d97706" />
            )}
            {farmer.landOwnership && (
              <InfoRow icon="fas fa-file-contract" label="Land Ownership"     value={LAND_OWN_LABEL[farmer.landOwnership] ?? farmer.landOwnership}                iconColor="#7c3aed" />
            )}
            <InfoRow icon="fas fa-leaf"           label="Farming Type"       value={FARMING_LABEL[farmer.farmingType] ?? farmer.farmingType}                      iconColor="#0d9488" />
            {farmer.annualYieldQuintals != null && (
              <InfoRow icon="fas fa-weight-scale" label="Annual Yield"        value={`${Number(farmer.annualYieldQuintals).toFixed(1)} Quintals`}                 iconColor="#16a34a" />
            )}
            <InfoRow icon="fas fa-graduation-cap" label="Education"          value={farmer.educationLevel}                                                        iconColor="#7c3aed" />
            <InfoRow icon="fas fa-users"          label="Family Members"      value={farmer.familyMembers}                                                         iconColor="#e11d48" />
            {farmer.practiceNotes && (
              <div className="sm:col-span-2 md:col-span-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-[0.63rem] text-muted-foreground uppercase tracking-wide mb-1.5">Practice Notes</div>
                <p className="text-sm text-foreground leading-relaxed">{farmer.practiceNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <AccessDeniedBox label="Detailed farm data (soil, water source, education, family) — visible to field roles and above" />
        )}
      </SectionCard>

      {/* â•â• Sensitive Info â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* Additional / Extended Fields */}
      {(() => {
        const extFieldDefs = getAllExtendedFields();
        const rawCustom    = farmer.custom_fields ?? {};

        // Build a map from key -> definition for O(1) label/type lookup
        const defByKey = Object.fromEntries(extFieldDefs.map(f => [f.key, f]));

        // Show ALL non-empty saved values, even if the field definition was later removed
        const allEntries = Object.entries(rawCustom).filter(([, v]) => v != null && v !== '');
        if (!allEntries.length) return null;

        // Hide fields whose key/label contains sensitive keywords for non-privileged roles
        const SENSITIVE_WORDS = ['aadhaar', 'aadhar', 'pan', 'bank', 'account', 'income', 'salary', 'loan', 'ifsc'];
        function isSensitive(key) {
          const def = defByKey[key];
          const haystack = (key + ' ' + (def?.label ?? '')).toLowerCase();
          return SENSITIVE_WORDS.some(w => haystack.includes(w));
        }

        const visibleEntries = allEntries.filter(([key]) => canSensitive || !isSensitive(key));
        const blockedCount   = allEntries.length - visibleEntries.length;

        if (!visibleEntries.length && blockedCount === 0) return null;

        function getLabel(key) {
          const def = defByKey[key];
          if (def?.label) return def.label;
          return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
            .replace(/\b\w/g, c => c.toUpperCase());
        }

        function getIcon(key) {
          const t = defByKey[key]?.type;
          if (t === 'number')                     return 'fas fa-hashtag';
          if (t === 'date')                       return 'fas fa-calendar-days';
          if (t === 'toggle' || t === 'checkbox') return 'fas fa-toggle-on';
          if (t === 'textarea')                   return 'fas fa-align-left';
          return 'fas fa-tag';
        }

        function displayValue(key, v) {
          const def = defByKey[key];
          if (def?.type === 'toggle' || def?.type === 'checkbox') {
            return v === true || v === 'true' || v === 1 || v === '1' ? 'Yes' : 'No';
          }
          if (Array.isArray(v)) return v.join(', ');
          return String(v);
        }

        return (
          <SectionCard
            title="Additional Details"
            icon="fas fa-list-ul"
            iconColor="#7c3aed"
            badge={<Badge variant="info">{visibleEntries.length} field{visibleEntries.length !== 1 ? 's' : ''}</Badge>}
          >
            {visibleEntries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {visibleEntries.map(([key, v]) => (
                  <InfoRow
                    key={key}
                    icon={getIcon(key)}
                    label={getLabel(key)}
                    value={displayValue(key, v)}
                    iconColor="#7c3aed"
                  />
                ))}
              </div>
            )}
            {blockedCount > 0 && (
              <div className={visibleEntries.length > 0 ? 'mt-4' : ''}>
                <AccessDeniedBox
                  label={`${blockedCount} sensitive field${blockedCount !== 1 ? 's' : ''} hidden — visible to Supervisor, Admin, and Leadership only`}
                />
              </div>
            )}
          </SectionCard>
        );
      })()}

      {/* Crops */}
      {canFieldDetails && farmer.crops && farmer.crops.length > 0 && (
        <SectionCard title="Crops" icon="fas fa-wheat-awn" iconColor="#16a34a"
          badge={<Badge variant="success">{farmer.crops.length} crop{farmer.crops.length !== 1 ? 's' : ''}</Badge>}>
          <div className="flex flex-wrap gap-2">
            {farmer.crops.map((cropName, i) => (
              <span key={cropName} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${i === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-muted/40 border-border text-foreground'}`}>
                <i className={`fas fa-seedling text-[0.6rem] ${i === 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
                {cropName}
                {i === 0 && <span className="text-[0.55rem] font-bold text-green-600 ml-0.5">PRIMARY</span>}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Sensitive Information"
        icon="fas fa-shield-halved"
        iconColor="#e11d48"
        badge={<Badge variant="danger">Restricted</Badge>}
      >
        {canSensitive ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <InfoRow icon="fas fa-id-card"              label="Aadhaar (Masked)"      value={farmer.aadhaar}      iconColor="#e11d48" mono />
            <InfoRow icon="fas fa-building-columns"     label="Bank Account (Masked)" value={farmer.bankAccount}  iconColor="#2563eb" mono />
            <InfoRow icon="fas fa-indian-rupee-sign"    label="Est. Annual Income"    value={farmer.annualIncome ? `₹ ${Number(farmer.annualIncome).toLocaleString('en-IN')}` : '—'} iconColor="#16a34a" />
          </div>
        ) : (
          <AccessDeniedBox label="Aadhaar, bank account, and income — visible to Supervisor, Admin, and Leadership only" />
        )}
      </SectionCard>

      {/* â•â• Adoption Score Gauge â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <SectionCard title="Adoption Readiness Score" icon="fas fa-chart-line" iconColor={band.color}>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Donut gauge */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none"
                  stroke={band.color} strokeWidth="12"
                  strokeDasharray={`${(farmer.adoptionScore / 100) * 251.3} 251.3`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold" style={{ color: band.color }}>{farmer.adoptionScore}</span>
                <span className="text-[0.6rem] text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
              style={{ background: band.bg, color: band.color, borderColor: band.ring }}>
              <i className={band.icon} />{band.label}
            </div>
          </div>
          {/* Scale bar */}
          <div className="flex-1 w-full space-y-4">
            <div className="text-xs font-semibold text-foreground">Score Scale</div>
            <div className="h-4 rounded-full overflow-hidden flex bg-muted gap-px">
              {SCORE_SEGMENTS.map(({ label, w, color }) => (
                <div key={label} className="h-full" style={{ width: `${w}%`, background: color }} title={label} />
              ))}
            </div>
            <div className="relative h-6">
              <div className="absolute top-0 flex flex-col items-center"
                style={{ left: `${farmer.adoptionScore}%`, transform: 'translateX(-50%)' }}>
                <div className="w-0.5 h-4 rounded-full" style={{ background: band.color }} />
                <span className="text-[0.6rem] font-extrabold whitespace-nowrap" style={{ color: band.color }}>
                  {farmer.adoptionScore}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-[0.65rem] text-muted-foreground">
              {SCORE_SEGMENTS.map(({ label, color }) => (
                <span key={label}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* â•â• Plan Components â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* Readiness & Engagement */}
      {canFieldDetails && (
        <SectionCard title="Readiness & Engagement" icon="fas fa-gauge-high" iconColor="#d97706">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Adoption Readiness */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground flex items-center gap-2">
                <i className="fas fa-chart-line text-amber-600" /> Adoption Readiness
              </p>
              {farmer.interestLevel ? (
                <InfoRow icon="fas fa-fire-flame-curved" label="Interest Level"
                  value={INTEREST_LABEL[farmer.interestLevel] ?? farmer.interestLevel}
                  iconColor={INTEREST_COLOR[farmer.interestLevel] ?? '#6b7280'} />
              ) : null}
              {farmer.trainingWillingness ? (
                <InfoRow icon="fas fa-chalkboard-user" label="Training Willingness"
                  value={WILLINGNESS_LABEL[farmer.trainingWillingness] ?? farmer.trainingWillingness}
                  iconColor="#7c3aed" />
              ) : null}
              {farmer.adoptionTimeline ? (
                <InfoRow icon="fas fa-calendar-days" label="Adoption Timeline"
                  value={farmer.adoptionTimeline} iconColor="#2563eb" />
              ) : null}
              {farmer.attendedTraining > 0 && (
                <InfoRow icon="fas fa-graduation-cap" label="Training Sessions Attended"
                  value={String(farmer.attendedTraining)} iconColor="#0d9488" />
              )}
              {!farmer.interestLevel && !farmer.trainingWillingness && !farmer.adoptionTimeline && (
                <p className="text-xs text-muted-foreground italic">No readiness data recorded.</p>
              )}
            </div>

            {/* Field Engagement */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground flex items-center gap-2">
                <i className="fas fa-bullseye text-blue-600" /> Field Engagement
              </p>
              {farmer.priority ? (
                <InfoRow icon="fas fa-flag" label="Priority"
                  value={farmer.priority.charAt(0).toUpperCase() + farmer.priority.slice(1)}
                  iconColor={PRIORITY_COLOR[farmer.priority] ?? '#6b7280'} />
              ) : null}
              {farmer.followupDate ? (
                <InfoRow icon="fas fa-calendar-plus" label="Follow-up Date"
                  value={String(farmer.followupDate)} iconColor="#d97706" />
              ) : null}
              {farmer.nextAction ? (
                <InfoRow icon="fas fa-circle-arrow-right" label="Next Action"
                  value={farmer.nextAction} iconColor="#2563eb" />
              ) : null}
              {farmer.referredBy ? (
                <InfoRow icon="fas fa-user-group" label="Referred By"
                  value={farmer.referredBy} iconColor="#6b7280" />
              ) : null}
              {farmer.consultNotes ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-[0.63rem] text-muted-foreground uppercase tracking-wide mb-1.5">Consulting Notes</div>
                  <p className="text-sm text-foreground leading-relaxed">{farmer.consultNotes}</p>
                </div>
              ) : null}
              {!farmer.priority && !farmer.followupDate && !farmer.nextAction && !farmer.consultNotes && (
                <p className="text-xs text-muted-foreground italic">No engagement data recorded.</p>
              )}
            </div>

          </div>
        </SectionCard>
      )}

      <SectionCard title="Consulting Plan Components" icon="fas fa-list-check" iconColor="#16a34a">
        <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-muted/40 border border-border">
          <div className="text-2xl font-extrabold text-foreground">{pct}%</div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-semibold text-foreground">{doneCount} / {compEntries.length} done</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {compEntries.map(([key, status]) => {
            const meta = COMP_META[key]      ?? { icon: 'fas fa-circle', label: key, color: '#6b7280' };
            const st   = COMP_STATUS[status] ?? COMP_STATUS.pending;
            return (
              <div key={key} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
                  <i className={`${meta.icon} text-base`} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                  <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                    <i className={`${st.icon} mr-1`} style={{ color: st.color }} />{st.label}
                  </div>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* â•â• Farm Photos â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {canFieldDetails && (
        <PhotoSection
          photos={farmer.farmPhotos ?? []}
          farmerId={farmer.id}
          onUploaded={(updated) => setFarmer(f => ({ ...f, farmPhotos: updated }))}
        />
      )}

      {/* â•â• Visit History â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <SectionCard title="Visit History" icon="fas fa-calendar-check" iconColor="#2563eb">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { icon: 'fas fa-calendar-check', label: 'Last Visit',  value: farmer.lastVisit ?? '—',             bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#16a34a' },
            { icon: 'fas fa-calendar-plus',  label: 'Next Visit',  value: farmer.nextVisit ?? 'Not scheduled', bg: '#eff6ff', border: '#bfdbfe', iconColor: '#2563eb' },
          ].map(({ icon, label, value, bg, border, iconColor }) => (
            <div key={label} className="rounded-xl p-3 flex items-center gap-3 border" style={{ background: bg, borderColor: border }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${iconColor}20` }}>
                <i className={`${icon} text-sm`} style={{ color: iconColor }} />
              </div>
              <div>
                <div className="text-[0.62rem] text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-sm font-bold text-foreground">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {farmerVisits.length > 0 ? (
          <div className="relative ml-4 pl-5 border-l-2 border-border space-y-3">
            {farmerVisits.map(v => (
              <div key={v.id} className="relative">
                <div className="absolute -left-[1.65rem] top-2 w-3 h-3 rounded-full border-2 bg-white"
                  style={{ borderColor: v.status === 'completed' ? '#16a34a' : '#d97706' }} />
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{v.type}</div>
                      <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                        <i className="fas fa-calendar mr-1 opacity-60" />{v.date}
                        {v.location && <><span className="mx-1 opacity-30">|</span><i className="fas fa-map-pin mr-1 opacity-60" />{v.location}</>}
                      </div>
                    </div>
                    <Badge variant={v.status === 'completed' ? 'success' : 'warning'}>
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </Badge>
                  </div>
                  {v.notes && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                      <i className="fas fa-note-sticky mr-1 opacity-60" />{v.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
            <i className="fas fa-calendar-xmark text-3xl opacity-25" />
            <span className="text-sm">No visit records found for this farmer</span>
          </div>
        )}
      </SectionCard>

      {/* â•â• Submission Audit Trail â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <SectionCard title="Registration &amp; Audit Trail" icon="fas fa-clipboard-check" iconColor="#7c3aed">
        {canAudit ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <InfoRow icon="fas fa-calendar-plus"             label="Registration Date" value={farmer.registrationDate} iconColor="#2563eb" />
              <InfoRow icon="fas fa-user-pen"                  label="Registered By"     value={farmer.registeredBy}     iconColor="#16a34a" />
              <InfoRow icon="fas fa-id-badge"                  label="Submitter Role"    value={ROLE_LABEL[farmer.submittedByRole] ?? farmer.submittedByRole} iconColor="#d97706" />
              <InfoRow icon="fas fa-magnifying-glass-location" label="Survey Date"       value={farmer.surveyDate}       iconColor="#e11d48" />
              <InfoRow icon="fas fa-user-check"                label="Approved By"       value={farmer.approvedBy}       iconColor="#7c3aed" />
              <InfoRow icon="fas fa-calendar-check"            label="Approval Date"     value={farmer.approvedDate}     iconColor="#0d9488" />
            </div>

            {farmer.submissionNotes && (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 mb-5">
                <div className="flex items-start gap-2">
                  <i className="fas fa-note-sticky text-amber-500 text-sm mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[0.65rem] font-bold text-amber-700 uppercase tracking-wide mb-1">Field Submission Notes</div>
                    <p className="text-xs text-amber-900 leading-relaxed">{farmer.submissionNotes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lifecycle timeline */}
            <div className="border-t border-border pt-4">
              <div className="text-xs font-semibold text-foreground mb-3">Lifecycle Timeline</div>
              <div className="relative ml-3 pl-6 border-l-2 border-border space-y-4">
                {LIFECYCLE.map(({ icon, color, label, by, date }) => (
                  <div key={label} className="relative flex items-start gap-3">
                    <div className="absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full border-2 bg-white"
                      style={{ borderColor: color }} />
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                      <i className={`${icon} text-xs`} style={{ color }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{label}</div>
                      <div className="text-[0.65rem] text-muted-foreground">by {by} · {date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <AccessDeniedBox label="Submission audit trail — visible to Supervisor, Admin, and Leadership only" />
        )}
      </SectionCard>

      {/* â•â• Action bar â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex flex-wrap gap-3 justify-end pt-1 pb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left mr-2" /> Back
        </Button>
        <Button variant="ghost" onClick={() => setVisitOpen(true)}>
          <i className="fas fa-calendar-plus mr-2" /> Log Visit
        </Button>
        <Button variant="primary" onClick={() => setPlanOpen(true)}>
          <i className="fas fa-file-lines mr-2" /> View Full Plan
        </Button>
      </div>

      {/* ── Modals / Drawers ── */}
      {planOpen && (
        <PlanDrawer
          farmer={farmer}
          band={band}
          compEntries={compEntries}
          doneCount={doneCount}
          pct={pct}
          onClose={handleClosePlan}
          onLogVisit={() => { setPlanOpen(false); setVisitOpen(true); }}
        />
      )}

      <VisitLogModal
        isOpen={visitOpen}
        onClose={() => setVisitOpen(false)}
        onSave={() => setVisitOpen(false)}
        preselectedFarmer={farmer ? { id: farmer.id, name: farmer.name, village: farmer.village } : null}
      />

    </div>
  );
}
