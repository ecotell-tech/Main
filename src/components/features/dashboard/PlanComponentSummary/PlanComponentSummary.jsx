import Card                          from '@common/Card/Card';
import Badge                         from '@common/Badge/Badge';
import ProgressBar                   from '@common/ProgressBar/ProgressBar';
import MOCK_PLAN_COMPONENT_SUMMARY from '@data/mock/plan-components.json';

export default function PlanComponentSummary() {
  return (
    <Card>
      <Card.Header
        title="Plan Component Completion"
        icon="fas fa-tasks"
        iconStyle={{ color: '#d97706' }}
      >
        <Badge variant="success">This Month</Badge>
      </Card.Header>

      <Card.Body>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {MOCK_PLAN_COMPONENT_SUMMARY.map(({ id, icon, label, completed, total, barVariant, iconColor }) => {
            const pct = Math.round((completed / total) * 100);
            return (
              <div key={id}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold" style={{ color: iconColor }}>
                    <i className={icon} aria-hidden="true" /> {label}
                  </span>
                  <span className="text-xs font-bold text-foreground">{completed}/{total}</span>
                </div>
                <ProgressBar
                  value={pct}
                  variant={barVariant}
                  barStyle={barVariant === 'brown' ? { background: '#92400e' } : undefined}
                />
                <div className="text-[0.68rem] text-muted-foreground mt-1">{pct}% complete</div>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}