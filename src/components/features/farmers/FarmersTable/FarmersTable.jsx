import { useNavigate }  from 'react-router-dom';
import FarmerRow    from '@features/farmers/FarmerRow/FarmerRow';
import Badge        from '@common/Badge/Badge';
import Avatar       from '@common/Avatar/Avatar';
import Button       from '@common/Button/Button';
import { PaginationBar } from '@hooks/usePagination';
import FORM_OPTIONS from '@data/config/formOptions.json';

const CROP_OPTIONS   = FORM_OPTIONS.cropFilterOptions;
const STATUS_OPTIONS = FORM_OPTIONS.planStatusOptions;

const inputCls = 'h-9 px-3 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

const SCORE_INFO = (s) =>
  s >= 70 ? { variant: 'success', label: 'High',   color: 'hsl(var(--primary))' }
  : s >= 40 ? { variant: 'warning', label: 'Medium', color: '#9A5000' }
  :           { variant: 'muted',   label: 'Low',    color: '#92400e' };

const PLAN_VARIANT = { active: 'success', pending: 'warning', completed: 'info', rejected: 'destructive' };

export default function FarmersTable({
  farmers,
  role,
  searchQuery,
  onSearchChange,
  cropFilter,
  onCropChange,
  statusFilter,
  onStatusChange,
  totalCount,
  pageSize = 10,
  filteredCount,
  page,
  setPage,
  totalPages,
  onLogVisit,
  onReject,
}) {
  const navigate   = useNavigate();
  const isTeamLead = role === 'team_lead' || role === 'supervisor';

  // Desktop table headers — insert "Registered By" for team lead
  const headers = isTeamLead
    ? ['Farmer', 'Village / District', 'Crop', 'Land (Ac)', 'Adoption Score', 'Plan Status', 'Registered By', 'Components', 'Last Visit', 'Actions']
    : ['Farmer', 'Village / District', 'Crop', 'Land (Ac)', 'Adoption Score', 'Plan Status', 'Components', 'Last Visit', 'Actions'];

  return (
    <>
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            className={`${inputCls} pl-9 w-full`}
            placeholder="Search name, village, district..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search farmers"
          />
        </div>
        <div className="flex gap-2">
          <select
            className={`${inputCls} flex-1 sm:flex-none pr-8`}
            value={cropFilter}
            onChange={(e) => onCropChange(e.target.value)}
            aria-label="Filter by crop"
          >
            <option value="">All Crops</option>
            {CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className={`${inputCls} flex-1 sm:flex-none pr-8`}
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2.5">
        {farmers.length > 0 ? farmers.map((farmer) => {
          const si  = SCORE_INFO(farmer.adoptionScore);
          const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1);
          const isRejected = farmer.reviewStatus === 'rejected';
          return (
            <div key={farmer.id} className={`rounded-2xl border bg-card shadow-sm p-4 space-y-3 ${isRejected ? 'border-red-200' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                <Avatar initials={farmer.initials} gradient={farmer.avatarGradient} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{farmer.name}</div>
                  <div className="text-[0.68rem] text-muted-foreground">{farmer.village}, {farmer.district}</div>
                  {isTeamLead && (
                    <div className="text-[0.62rem] text-primary/70 mt-0.5">
                      <i className="fas fa-user mr-1" />
                      {farmer.repName}
                    </div>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[0.6rem] font-semibold mt-0.5">
                      <i className="fas fa-times-circle text-[0.55rem]" />
                      Rejected{farmer.rejectionReason ? ` — ${farmer.rejectionReason}` : ''}
                    </span>
                  )}
                </div>
                <Badge variant={PLAN_VARIANT[farmer.planStatus] ?? 'warning'}>{cap(farmer.planStatus)}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-0.5">Crop</div>
                  <div className="font-medium">{farmer.crop}</div>
                </div>
                <div>
                  <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-0.5">Land</div>
                  <div className="font-medium">{farmer.landAcres != null ? Number(farmer.landAcres).toFixed(1) : '—'} Ac</div>
                </div>
                <div>
                  <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wide mb-0.5">Score</div>
                  <span className="font-bold" style={{ color: si.color }}>{farmer.adoptionScore}</span>
                  <span className="text-[0.65rem] text-muted-foreground ml-1">{si.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[0.68rem] text-muted-foreground">
                  <i className="fas fa-calendar-check mr-1 opacity-60" aria-hidden="true" />
                  {farmer.lastVisit}
                </div>
                <div className="flex gap-1.5">
                  <Button variant="blue" size="sm" onClick={() => navigate(`/app/farmers/${farmer.id}`)}>
                    <i className="fas fa-eye" aria-hidden="true" /> View
                  </Button>
                  {isTeamLead && !isRejected && (
                    <Button
                      variant="ghost" size="sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => onReject?.(farmer)}
                    >
                      <i className="fas fa-times-circle" aria-hidden="true" /> Reject
                    </Button>
                  )}
                  {(role === 'agronomist' || role === 'data_entry_operator') && isRejected && (
                    <Button
                      variant="outline" size="sm"
                      className="border-red-300 text-red-600"
                      onClick={() => navigate('/app/register', { state: { resumeFarmerId: farmer.id } })}
                    >
                      <i className="fas fa-pencil" aria-hidden="true" /> Edit
                    </Button>
                  )}
                  {!isTeamLead && (
                    <Button variant="ghost" size="sm" disabled={farmer.planStatus === 'completed'} onClick={() => onLogVisit?.(farmer)}>
                      <i className="fas fa-map-marker-alt" aria-hidden="true" /> Visit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <i className="fas fa-search mr-2" aria-hidden="true" />
            No farmers match the current filters.
          </div>
        )}
        <div className="text-xs text-muted-foreground px-1 py-2">
          Showing {farmers.length} of {totalCount} farmers
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground bg-muted/50 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {farmers.length > 0 ? (
                farmers.map((farmer) => (
                  <FarmerRow
                    key={farmer.id}
                    farmer={farmer}
                    role={role}
                    onLogVisit={onLogVisit}
                    onReject={onReject}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="py-12 text-center text-muted-foreground text-sm">
                    <i className="fas fa-search mr-2" aria-hidden="true" />
                    No farmers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          stats={{
            total:    filteredCount ?? totalCount,
            pages:    totalPages ?? 1,
            safePage: page ?? 1,
            start:    (filteredCount ?? totalCount) === 0 ? 0 : ((page ?? 1) - 1) * (pageSize ?? 10) + 1,
            end:      Math.min((page ?? 1) * (pageSize ?? 10), filteredCount ?? totalCount),
          }}
          pageNumbers={Array.from({ length: totalPages ?? 1 }, (_, i) => i + 1)
            .filter(p => p === 1 || p === (totalPages ?? 1) || Math.abs(p - (page ?? 1)) <= 1)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])}
          page={page ?? 1}
          setPage={setPage ?? (() => {})}
          label="farmers"
        />
      </div>
    </>
  );
}
