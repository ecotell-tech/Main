/**
 * Button — unified action button.
 *
 * @param {'primary'|'outline'|'amber'|'blue'|'ghost'|'danger'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean}         [block=false]  - Full-width button.
 * @param {boolean}         [loading=false]
 * @param {boolean}         [disabled=false]
 * @param {string}          [type='button']
 * @param {Function}        [onClick]
 * @param {React.ReactNode} children
 * @param {string}          [className]
 */
import { Button as ShadButton } from '@ui/button';

export default function Button({
  variant  = 'primary',
  size     = 'md',
  block    = false,
  loading  = false,
  disabled = false,
  type     = 'button',
  onClick,
  children,
  className = '',
  ...rest
}) {
  return (
    <ShadButton
      variant={variant}
      size={size}
      block={block}
      loading={loading}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {children}
    </ShadButton>
  );
}
