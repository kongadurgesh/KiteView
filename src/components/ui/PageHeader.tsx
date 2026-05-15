import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  centered?: boolean;
  className?: string;
}

export function PageHeader({ title, description, action, centered, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'w-full mb-6',
        centered ? 'text-center' : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        className,
      )}
    >
      <div className={centered ? 'max-w-2xl mx-auto' : ''}>
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className={cn('page-desc mt-1', centered && 'mx-auto max-w-lg')}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
