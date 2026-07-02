import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-green-900',
        primary:     'bg-primary text-primary-foreground hover:bg-green-900',
        outline:     'border border-primary bg-transparent text-primary hover:bg-primary/10',
        ghost:       'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        danger:      'bg-destructive text-destructive-foreground hover:bg-red-700',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-red-700',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        blue:        'bg-blue-600 text-white hover:bg-blue-700',
        amber:       'bg-amber-500 text-white hover:bg-amber-600',
      },
      size: {
        default: 'h-9 px-4 py-2',
        md:      'h-9 px-4 py-2',
        sm:      'h-8 px-3 text-xs rounded-md',
        lg:      'h-11 px-8 text-base rounded-xl',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, block = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), block && 'w-full', className)}
        ref={ref}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <i className="fas fa-spinner fa-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
