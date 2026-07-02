/**
 * Avatar — displays user initials inside a coloured circle.
 *
 * @param {string}  initials   - Up to 2 characters shown.
 * @param {string}  [gradient] - CSS gradient for the background.
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {string}  [className]
 */
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-[0.6rem]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-11 h-11 text-sm',
};

export default function Avatar({ initials = '?', gradient, size = 'md', className = '' }) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const bgStyle   = gradient
    ? { background: gradient }
    : { background: 'linear-gradient(135deg, #2E7D32, #4CAF50)' };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none',
        sizeClass,
        className
      )}
      style={bgStyle}
      aria-label={initials}
    >
      {initials}
    </div>
  );
}
