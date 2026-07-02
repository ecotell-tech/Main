import { useState, useEffect, useMemo } from 'react';
import { useNavigate }   from 'react-router-dom';
import Badge             from '@common/Badge/Badge';
import Button            from '@common/Button/Button';
import { useToast }      from '@hooks/useToast';
import { getDraftFarmers } from '@services/farmerService';

const SECTION_LABELS = {
  basic:     { label: 'Basic Info',   icon: 'fas fa-user'       },
  location:  { label: 'Location',     icon: 'fas fa-map-pin'    },
  farm:      { label: 'Farm Details', icon: 'fas fa-wheat-awn'  },
  financial: { label: 'Financial',    icon: 'fas fa-rupee-sign' },
  photos:    { label: 'Photos',       icon: 'fas fa-camera'     },
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function computeSections(f) {
  return {
    basic:     true,
    location:  f.village && f.village !== '—',
    farm:      f.landAcres > 0,
    financial: f.annualIncome !== null,
    photos:    false,
  };
}

function toDisplay(f) {
  const sections      = computeSections(f);
  const doneCount     = Object.values(sections).filter(Boolean).length;
  const completionPct = Math.round((doneCount / Object.keys(sections).length) * 100);
  return {
    id:           f.farmer_code ?? String(f.id),
    farmerId:     f.id,
    farmerName:   f.name,
    village:      f.village !== '—' ? f.village : '—',
    taluka:       f.taluka  !== '—' ? f.taluka  : '—',
    district:     f.district !== '—' ? f.district : '—',
    crop:         f.crop    !== '—' ? f.crop    : 'Unknown',
    completionPct,
    lastModified: f.registrationDate ?? '—',
    sections,
    initials:     getInitials(f.name),
    color:        f.avatarGradient ?? 'linear-gradient(135deg,#6b7280,#9ca3af)',
  };
}

export default function DraftListPage() {
  const navigate       = useNavigate();
  const { showToast }  = useToast();

  const [farmers,  setFarmers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [confirm,  setConfirm]  = useState(null);

  async function loadFarmers() {
    setLoading(true);
    setError(null);
    try {
      const res = await getDraftFarmers({ limit: 100 });
      setFarmers((res.farmers ?? []).map(toDisplay));
    } catch {
      setError('Failed to load draft registrations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFarmers(); }, []);

  const filtered = useMemo(() => {
    if (!search) return farmers;
    const q = search.toLowerCase();
    return farmers.filter(d =>
      d.farmerName.toLowerCase().includes(q) ||
      d.village.toLowerCase().includes(q)
    );
  }, [farmers, search]);

  function handleResume(draft) {
    navigate('/app/register', { state: { resumeFarmerId: draft.farmerId } });
  }

  function handleDelete() {
    const d = farmers.find(x => x.id === confirm);
    setFarmers(prev => prev.filter(x => x.id !== confirm));
    showToast(`Removed ${d?.farmerName ?? 'farmer'} from this view.`, 'info');
    setConfirm(null);
  }

  const full    = farmers.filter(d => d.completionPct === 100).length;
  const partial = farmers.filter(d => d.completionPct >= 50 && d.completionPct < 100).length;
  const low     = farmers.filter(d => d.completionPct < 50).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Farmer Registrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Recently registered farmers with profile completion status</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/app/register')}>
          <i className="fas fa-plus mr-2" /> New Registration
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <i className="fas fa-circle-exclamation" /> {error}
          <button className="ml-auto underline text-xs" onClick={loadFarmers}>Retry</button>
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Complete',    value: full,    color: '#16a34a', icon: 'fas fa-circle-check'       },
            { label: 'In Progress', value: partial, color: '#d97706', icon: 'fas fa-circle-half-stroke' },
            { label: 'Just Started', value: low,   color: '#ef4444', icon: 'fas fa-circle-dot'         },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="rounded-xl bg-muted/40 border border-border p-3 text-center">
              <i className={`${icon} text-lg mb-1 block`} style={{ color }} />
              <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
              <div className="text-[0.62rem] text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search text-xs text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or village…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-input bg-card focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-40" />
                  <div className="h-2 bg-muted rounded w-64" />
                  <div className="h-2 bg-muted rounded w-full mt-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Farmer list */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
            <i className="fas fa-file-pen text-3xl opacity-30" />
          </div>
          <div className="text-sm">{search ? 'No results match your search.' : 'No farmer registrations found.'}</div>
          <Button variant="primary" onClick={() => navigate('/app/register')}>
            <i className="fas fa-plus mr-2" /> Start New Registration
          </Button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(draft => {
            const pct   = draft.completionPct;
            const color = pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#ef4444';
            return (
              <div key={draft.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 p-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0"
                    style={{ background: draft.color }}
                  >
                    {draft.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-bold text-foreground">{draft.farmerName}</div>
                        <div className="text-[0.65rem] text-muted-foreground mt-0.5">
                          {[draft.village, draft.taluka, draft.district, draft.crop].filter(v => v && v !== '—').join(' · ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pct === 100 && <Badge variant="success"><i className="fas fa-check mr-1" />Complete</Badge>}
                        <Badge variant="muted">{draft.id}</Badge>
                      </div>
                    </div>

                    {/* Completion bar */}
                    <div className="mt-3 mb-2">
                      <div className="flex justify-between text-[0.62rem] mb-1">
                        <span className="text-muted-foreground">Profile Completion</span>
                        <span className="font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>

                    {/* Section pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(draft.sections).map(([key, done]) => {
                        const meta = SECTION_LABELS[key];
                        return (
                          <div
                            key={key}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold border ${done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted/40 border-border text-muted-foreground'}`}
                          >
                            <i className={`${meta.icon} text-[0.55rem]`} />
                            {meta.label}
                            {done && <i className="fas fa-check text-[0.5rem]" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                      <div className="text-[0.62rem] text-muted-foreground flex items-center gap-1">
                        <i className="fas fa-clock" /> Registered: {draft.lastModified}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm(draft.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors"
                        >
                          <i className="fas fa-eye-slash mr-1" />Hide
                        </button>
                        <Button variant="primary" onClick={() => handleResume(draft)}>
                          <i className="fas fa-play mr-1.5" />Resume
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm hide dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <i className="fas fa-eye-slash text-2xl text-amber-500" />
            </div>
            <div>
              <div className="text-base font-extrabold text-foreground">Hide from this view?</div>
              <div className="text-xs text-muted-foreground mt-1">
                <strong>{farmers.find(d => d.id === confirm)?.farmerName}</strong> will be removed from this list but their record remains in the system.
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="primary" className="flex-1" onClick={handleDelete}>
                <i className="fas fa-eye-slash mr-2" />Hide
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
