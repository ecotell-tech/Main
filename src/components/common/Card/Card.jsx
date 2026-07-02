/**
 * Card compound component.
 *
 * Usage:
 *   <Card>
 *     <Card.Header title="..."><Button>...</Button></Card.Header>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 */

import { cn } from '@/lib/utils';

function Card({ children, className = '' }) {
  return (
    <div className={cn('bg-card text-card-foreground rounded-2xl border border-border shadow-sm hover:shadow-elevated transition-shadow', className)}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, iconStyle, children, className = '' }) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-muted/50 to-transparent', className)}>
      <h3 className="flex items-center gap-2 text-[0.9rem] font-bold text-foreground font-heading tracking-tight">
        {icon && <i className={icon} style={iconStyle} aria-hidden="true" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}

function CardFooter({ children, className = '' }) {
  return (
    <div className={cn('px-6 py-3 border-t border-border bg-muted/40 rounded-b-2xl', className)}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body   = CardBody;
Card.Footer = CardFooter;

export default Card;
