import Modal          from '@common/Modal/Modal';
import Badge          from '@common/Badge/Badge';
import ProgressBar    from '@common/ProgressBar/ProgressBar';
import Avatar         from '@common/Avatar/Avatar';
import Button         from '@common/Button/Button';

const COMPONENT_META = {
  irrigation:  { emoji: 'ðŸ’§', label: 'Irrigation',    color: '#2563eb' },
  fertilizer:  { emoji: 'ðŸŒ¿', label: 'Fertilizer',    color: 'hsl(var(--primary))' },
  spray:       { emoji: 'ðŸŒ«ï¸', label: 'Spray',          color: '#d97706' },
  cropAdvisory:{ emoji: 'ðŸŒ¾', label: 'Crop Advisory',  color: '#92400e' },
};

const STATUS_VARIANT = { done: 'success', active: 'warning', pending: 'muted' };
const STATUS_LABEL   = { done: 'Done',    active: 'Ongoing',  pending: 'Pending' };

export default function PlanViewModal({ isOpen, onClose, farmer }) {
  if (!farmer) return null;

  const completedCount = Object.values(farmer.components).filter((s) => s === 'done').length;
  const totalCount     = Object.values(farmer.components).length;
  const overallPct     = Math.round((completedCount / totalCount) * 100);

  const footer = (
    <Button variant="ghost" onClick={onClose}>Close</Button>
  );

  return (
    <Modal
      id="planViewModal"
      isOpen={isOpen}
      onClose={onClose}
      title="Consulting Plan"
      size="modal-lg"
      footer={footer}
    >
      {/* Farmer info strip */}
      <div className="flex items-center gap-3 mb-5 p-4 bg-background rounded-xl">
        <Avatar initials={farmer.initials} gradient={farmer.avatarGradient} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base text-foreground">{farmer.name}</div>
          <div className="text-xs text-muted-foreground">
            <i className="fas fa-map-marker-alt" aria-hidden="true" /> {farmer.village}, {farmer.district}
            &nbsp;|&nbsp; {farmer.crop}
            &nbsp;|&nbsp; {farmer.landAcres} Ac
          </div>
        </div>
        <Badge variant={farmer.planStatus === 'active' ? 'success' : farmer.planStatus === 'pending' ? 'warning' : 'info'}>
          {farmer.planStatus.charAt(0).toUpperCase() + farmer.planStatus.slice(1)}
        </Badge>
      </div>

      {/* Overall progress */}
      <div className="mb-5">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">Overall Completion</span>
          <span className="text-sm font-bold text-foreground">{completedCount}/{totalCount} ({overallPct}%)</span>
        </div>
        <ProgressBar value={overallPct} />
      </div>

      {/* Plan components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(farmer.components).map(([key, status]) => {
          const meta = COMPONENT_META[key];
          return (
            <div key={key} className="p-4 border border-border rounded-xl bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: meta.color }}>
                  {meta.emoji} {meta.label}
                </span>
                <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
              </div>
              <ProgressBar value={status === 'done' ? 100 : status === 'active' ? 50 : 0} />
            </div>
          );
        })}
      </div>

      {/* Adoption score */}
      <div className="mt-5 flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
        <i className="fas fa-seedling text-primary text-lg" aria-hidden="true" />
        <div>
          <span className="text-sm font-semibold text-green-800">
            Adoption Score: {farmer.adoptionScore}/100
          </span>
          <div className="text-xs text-muted-foreground mt-0.5">
            {farmer.adoptionScore >= 70 ? 'High readiness for organic adoption' :
             farmer.adoptionScore >= 40 ? 'Medium readiness — continued advisory needed' :
                                          'Low readiness — intensive coaching required'}
          </div>
        </div>
      </div>
    </Modal>
  );
}

const COMPONENT_META = {
  irrigation:  { emoji: 'ðŸ’§', label: 'Irrigation',    color: 'var(--clr-blue)' },
  fertilizer:  { emoji: 'ðŸŒ¿', label: 'Fertilizer',    color: 'var(--clr-primary)' },
  spray:       { emoji: 'ðŸŒ«ï¸', label: 'Spray',          color: 'var(--clr-amber)' },
  cropAdvisory:{ emoji: 'ðŸŒ¾', label: 'Crop Advisory',  color: 'var(--clr-brown)' },
};

const STATUS_VARIANT = { done: 'success', active: 'warning', pending: 'muted' };
const STATUS_LABEL   = { done: 'Done',    active: 'Ongoing',  pending: 'Pending' };

/**
 * PlanViewModal — full consulting plan detail for a selected farmer.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {import('@data/mock/farmers.mock').Farmer|null} farmer
 */
