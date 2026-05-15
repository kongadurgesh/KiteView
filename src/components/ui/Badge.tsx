import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan';

const variants: Record<Variant, string> = {
  default: 'bg-surface-muted dark:bg-surface-dark-muted text-ink-secondary dark:text-ink-dark-secondary',
  success: 'bg-positive-muted dark:bg-positive/15 text-positive dark:text-positive-dark',
  warning: 'bg-warning-muted dark:bg-warning/15 text-warning dark:text-warning-dark',
  danger: 'bg-negative-muted dark:bg-negative/15 text-negative dark:text-negative-dark',
  purple: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300',
  cyan: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
};

export function Badge({
  variant = 'default',
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
