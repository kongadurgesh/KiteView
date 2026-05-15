import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'error' | 'warning' | 'info';

const styles: Record<Variant, string> = {
  error: 'bg-negative-muted dark:bg-negative/10 border-negative/30 text-negative dark:text-negative-dark',
  warning: 'bg-warning-muted dark:bg-warning/10 border-warning/30 text-warning dark:text-warning-dark',
  info: 'bg-accent-muted dark:bg-accent-dark-muted border-accent/30 text-accent dark:text-blue-300',
};

interface AlertProps {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  return (
    <div className={cn('rounded-lg border p-4 text-sm', styles[variant], className)}>
      {title && <p className="font-medium mb-1">{title}</p>}
      <div className={title ? 'opacity-90' : ''}>{children}</div>
    </div>
  );
}
