import { useNavigate }  from 'react-router-dom';
import Badge           from '@common/Badge/Badge';
import Avatar          from '@common/Avatar/Avatar';
import Button          from '@common/Button/Button';
import PlanMiniStatus  from '@common/PlanMiniStatus/PlanMiniStatus';
import { ROUTES }      from '@constants/routes';

const getScoreInfo = (score) => {
  if (score >= 70) return { variant: 'success', label: 'High',   color: 'hsl(var(--primary))' };
  if (score >= 40) return { variant: 'warning', label: 'Medium', color: '#9A5000' };
  return               { variant: 'muted',   label: 'Low',    color: '#92400e' };
};

const PLAN_STATUS_VARIANT = {
  active:    'success',
  pending:   'warning',
  completed: 'info',
  rejected:  'destructive',
};

export default function FarmerRow({ farmer, role, onLogVisit, onReject }) {
  const navigate  = useNavigate();
  const scoreInfo = getScoreInfo(farmer.adoptionScore);
  const planStatusLabel = farmer.planStatus.charAt(0).toUpperCase() + farmer.planStatus.slice(1);

  const isTeamLead  = role === 'team_lead' || role === 'supervisor';
  const isRep       = role === 'agronomist' || role === 'data_entry_operator';
  const isRejected  = farmer.reviewStatus === 'rejected';

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-crop={farmer.crop} data-status={farmer.planStatus}>

      {/* Farmer name + ID */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar initials={farmer.initials} gradient={farmer.avatarGradient} size="sm" />
          <div>
            <div className="text-xs font-semibold text-foreground">{farmer.name}</div>
            <div className="text-[0.68rem] text-muted-foreground">ID: {farmer.farmer_code ?? farmer.id}</div>
            {/* Review status indicator */}
            {isRejected && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[0.6rem] font-semibold">
                  <i className="fas fa-times-circle text-[0.55rem]" />
                  Rejected
                </span>
              </div>
            )}
            {isTeamLead && farmer.reviewStatus === 'pending_review' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[0.6rem] font-semibold mt-0.5">
                <i className="fas fa-clock text-[0.55rem]" />
                Pending review
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="text-xs">{farmer.village}</div>
        <div className="text-[0.68rem] text-muted-foreground">{farmer.district}</div>
      </td>

      <td className="px-4 py-3 text-xs">{farmer.crop}</td>
      <td className="px-4 py-3 text-xs">{farmer.landAcres != null ? Number(farmer.landAcres).toFixed(1) : '—'}</td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color: scoreInfo.color }}>{farmer.adoptionScore}</span>
          <Badge variant={scoreInfo.variant}>{scoreInfo.label}</Badge>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge variant={PLAN_STATUS_VARIANT[farmer.planStatus] ?? 'warning'}>
          <i className="fas fa-circle text-[0.4rem]" aria-hidden="true" />
          {' '}{planStatusLabel}
        </Badge>
      </td>

      {/* Registered by — shown for team lead */}
      {isTeamLead && (
        <td className="px-4 py-3">
          <div className="text-xs font-medium text-foreground">{farmer.repName}</div>
          {farmer.rejectionReason && (
            <div className="text-[0.62rem] text-red-600 mt-0.5 max-w-[140px] truncate" title={farmer.rejectionReason}>
              <i className="fas fa-comment-slash mr-0.5" />
              {farmer.rejectionReason}
            </div>
          )}
        </td>
      )}

      <td className="px-4 py-3">
        <PlanMiniStatus components={farmer.components} />
      </td>

      <td className="px-4 py-3 text-xs">{farmer.lastVisit}</td>

      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Button
            variant="blue"
            size="sm"
            onClick={() => navigate(`/app/farmers/${farmer.id}`)}
            aria-label={`View detail for ${farmer.name}`}
          >
            <i className="fas fa-eye" aria-hidden="true" />
          </Button>

          {/* Representative: edit pencil when record is rejected */}
          {isRep && isRejected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.abs.registerFarmer, { state: { resumeFarmerId: farmer.id } })}
              aria-label={`Edit rejected record for ${farmer.name}`}
              title={farmer.rejectionReason ? `Rejected: ${farmer.rejectionReason}` : 'Record rejected — click to edit'}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <i className="fas fa-pencil" aria-hidden="true" />
            </Button>
          )}

          {/* Team lead: reject button */}
          {isTeamLead && !isRejected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject?.(farmer)}
              aria-label={`Reject registration of ${farmer.name}`}
              title="Reject this registration"
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <i className="fas fa-times-circle" aria-hidden="true" />
            </Button>
          )}

          {/* Log visit — hide for team lead (they review, don't visit) */}
          {!isTeamLead && (
            <Button
              variant="ghost"
              size="sm"
              disabled={farmer.planStatus === 'completed'}
              onClick={() => onLogVisit?.(farmer)}
              aria-label={`Log visit for ${farmer.name}`}
            >
              <i className="fas fa-map-marker-alt" aria-hidden="true" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
