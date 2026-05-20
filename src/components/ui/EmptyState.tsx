import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card w-full p-8 sm:p-10', className)}>
      <p className="section-title">{title}</p>
      {description && <p className="section-desc mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
