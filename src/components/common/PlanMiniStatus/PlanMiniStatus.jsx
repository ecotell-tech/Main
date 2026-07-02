/**
 * PlanMiniStatus — renders the four plan-component status icons in a row.
 *
 * @param {{ irrigation: string, fertilizer: string, spray: string, cropAdvisory: string }} components
 *   Each value: 'done' | 'active' | 'pending'
 */
import { cn } from '@/lib/utils';

const ICON_MAP = {
  done:    { icon: 'fas fa-check',    classes: 'bg-green-100 text-green-700' },
  active:  { icon: 'fas fa-spinner',  classes: 'bg-blue-100  text-blue-700 animate-spin' },
  pending: { icon: 'fas fa-clock',    classes: 'bg-gray-100  text-gray-500' },
};

const LABEL_MAP = {
  irrigation:   'Irrigation',
  fertilizer:   'Fertilizer',
  spray:        'Spray',
  cropAdvisory: 'Crop Advisory',
};

export default function PlanMiniStatus({ components }) {
  return (
    <div className="flex items-center gap-1.5">
      {Object.entries(components).map(([key, status]) => {
        const { icon, classes } = ICON_MAP[status] ?? ICON_MAP.pending;
        return (
          <div
            key={key}
            className={cn(
              'flex items-center justify-center w-6 h-6 rounded-full text-[0.6rem]',
              classes
            )}
            title={`${LABEL_MAP[key]}: ${status}`}
            aria-label={`${LABEL_MAP[key]}: ${status}`}
          >
            <i className={icon} aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
