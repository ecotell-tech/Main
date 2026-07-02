import Card             from '@common/Card/Card';
import MOCK_ACTIVITY from '@data/mock/activity.json';

const DOT_COLORS = {
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  amber:  'bg-amber-500',
  red:    'bg-red-500',
};

export default function ActivityTimeline() {
  return (
    <Card>
      <Card.Header title="Recent Activity" icon="fas fa-history" iconStyle={{ color: '#2563eb' }} />
      <Card.Body>
        <div className="space-y-3">
          {MOCK_ACTIVITY.map(({ id, dot, time, action, farmerSummary }) => (
            <div key={id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT_COLORS[dot] ?? DOT_COLORS.green}`} aria-hidden="true" />
                <div className="flex-1 w-px bg-border mt-1" />
              </div>
              <div className="pb-3 min-w-0">
                <div className="text-[0.7rem] text-muted-foreground leading-tight">{time}</div>
                <div className="text-xs font-medium text-foreground mt-0.5">{action}</div>
                <div className="text-[0.7rem] text-muted-foreground mt-0.5">{farmerSummary}</div>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
