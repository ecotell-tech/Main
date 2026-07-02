/**
 * ProgressBar — horizontal fill indicator.
 *
 * @param {number} value      - 0–100 percentage.
 * @param {''|'blue'|'amber'|'red'} [variant='']
 * @param {string} [barStyle] - Additional inline style for the bar (e.g. custom background).
 */
import { cn } from '@/lib/utils';

const VARIANT_COLOR = {
  '':     'bg-primary',
  blue:   'bg-blue-500',
  amber:  'bg-amber-500',
  red:    'bg-red-500',
};

export default function ProgressBar({ value, variant = '', barStyle }) {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));
  const barColor     = VARIANT_COLOR[variant] ?? VARIANT_COLOR[''];

  return (
    <div
      className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${clampedValue}%`, ...barStyle }}
      />
    </div>
  );
}
