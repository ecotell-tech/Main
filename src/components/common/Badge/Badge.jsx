/**
 * Badge — status pill label.
 *
 * @param {'success'|'warning'|'info'|'danger'|'muted'|'brown'} variant
 * @param {React.ReactNode} children
 * @param {string} [className]
 */
import { cn } from '@/lib/utils';

const VARIANT_CLASSES = {
  success: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-500/25',
  warning: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-500/25',
  info:    'bg-blue-100  text-blue-800  ring-1 ring-inset ring-blue-500/25',
  danger:  'bg-red-100   text-red-800   ring-1 ring-inset ring-red-500/25',
  muted:   'bg-gray-100  text-gray-600  ring-1 ring-inset ring-gray-400/25',
  brown:   'bg-amber-50  text-amber-900 ring-1 ring-inset ring-amber-700/25',
};

export default function Badge({ variant = 'muted', children, className = '' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold',
      VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.muted,
      className
    )}>
      {children}
    </span>
  );
}
