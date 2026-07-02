import StatCard from '@common/StatCard/StatCard';
import MOCK_STATS from '@data/mock/stats.json';

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {MOCK_STATS.map((stat) => (
        <StatCard
          key={stat.id}
          iconClass={stat.iconClass}
          iconVariant={stat.iconVariant}
          value={stat.value}
          label={stat.label}
          changeText={stat.changeText}
          changeType={stat.changeType}
        />
      ))}
    </div>
  );
}
