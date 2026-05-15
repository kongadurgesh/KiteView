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
    <div className={cn('card p-10 text-center', className)}>
      <p className="text-sm font-medium text-ink-primary dark:text-ink-dark-primary">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-2 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
