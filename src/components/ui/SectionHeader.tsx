import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      <div
        className={cn(
          'w-full flex flex-col gap-3',
          action ? 'sm:flex-row sm:items-start sm:justify-between' : undefined,
        )}
      >
        <div className="w-full min-w-0 flex-1">
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-desc">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
