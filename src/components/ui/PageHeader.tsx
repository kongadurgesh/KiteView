import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  align?: 'start' | 'center';
  className?: string;
}

export function PageHeader({ title, description, action, align = 'start', className }: PageHeaderProps) {
  const centered = align === 'center';

  return (
    <header
      className={cn(
        'w-full mb-6',
        centered ? 'text-center' : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        className,
      )}
    >
      <div className="w-full min-w-0 flex-1">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc mt-2">{description}</p>}
      </div>
      {action && <div className={cn('shrink-0', centered && 'flex justify-center')}>{action}</div>}
    </header>
  );
}
