import { useCountUp } from '@hooks/useCountUp';
import { cn } from '@/lib/utils';

const ICON_VARIANT_CLASSES = {
  green: 'bg-green-100 text-green-700',
  blue:  'bg-blue-100  text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  brown: 'bg-amber-50  text-amber-900',
  red:   'bg-red-100   text-red-700',
};

const ACCENT_CLASSES = {
  green: 'border-t-green-500',
  blue:  'border-t-blue-500',
  amber: 'border-t-amber-500',
  brown: 'border-t-amber-700',
  red:   'border-t-red-500',
};

export default function StatCard({ iconClass, iconVariant, value, label, changeText, changeType }) {
  const animatedCount = useCountUp(value);
  const changeIcon    = changeType === 'up' ? 'fas fa-arrow-up' : 'fas fa-exclamation';

  return (
    <div className={cn(
      'bg-white rounded-2xl border border-border border-t-2 shadow-sm p-5 flex items-start gap-4 hover:shadow-elevated transition-shadow',
      ACCENT_CLASSES[iconVariant] ?? ACCENT_CLASSES.green
    )}>
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-xl text-lg shrink-0',
          ICON_VARIANT_CLASSES[iconVariant] ?? ICON_VARIANT_CLASSES.green
        )}
        aria-hidden="true"
      >
        <i className={iconClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[1.7rem] font-extrabold text-foreground leading-none tracking-tight">{animatedCount}</div>
        <div className="text-[0.78rem] font-medium text-muted-foreground mt-1 truncate">{label}</div>
        <div className={cn(
          'flex items-center gap-1 mt-2 text-[0.72rem] font-semibold',
          changeType === 'up' ? 'text-green-600' : 'text-amber-600'
        )}>
          <i className={changeIcon} aria-hidden="true" />
          {changeText}
        </div>
      </div>
    </div>
  );
}
