import { useNavigate }       from 'react-router-dom';
import Card                  from '@common/Card/Card';
import Badge                 from '@common/Badge/Badge';
import Avatar                from '@common/Avatar/Avatar';
import Button                from '@common/Button/Button';
import MOCK_FARMERS      from '@data/mock/farmers.json';
import { ROUTES }            from '@constants/routes';

const PLAN_STATUS_VARIANT_MAP = {
  active:    'success',
  pending:   'warning',
  completed: 'info',
};

export default function RecentFarmersTable() {
  const navigate = useNavigate();
  const recentFarmers = MOCK_FARMERS.slice(0, 5);

  return (
    <Card>
      <Card.Header title="Recent Farmers" icon="fas fa-users" iconStyle={{ color: '#2E7D32' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.FARMERS)}>
          View All
        </Button>
      </Card.Header>
      <Card.Body>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Farmer', 'Crop', 'Location', 'Plan Status', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground bg-muted/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentFarmers.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={f.name} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">{f.name}</div>
                        <div className="text-[0.7rem] text-muted-foreground">{f.mobile}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{f.crop}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{f.location}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={PLAN_STATUS_VARIANT_MAP[f.planStatus] ?? 'info'}>
                      {f.planStatus}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.FARMERS)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  );
}