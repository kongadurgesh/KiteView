import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface DataTableProps {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}

export function DataTable({ children, minWidth = 640, className }: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0', className)}>
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onSort: () => void;
  align?: 'left' | 'right';
  sticky?: boolean;
}

export function SortableHeader({
  label,
  active,
  direction,
  onSort,
  align = 'right',
  sticky,
}: SortableHeaderProps) {
  return (
    <th
      className={cn(
        'p-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap',
        align === 'left' ? 'text-left' : 'text-right',
        active ? 'text-accent' : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink-secondary',
        sticky &&
          'sticky left-0 z-10 bg-surface-muted dark:bg-surface-dark-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]',
      )}
      onClick={onSort}
    >
      {label}
      {active && <span className="ml-1">{direction === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-muted dark:bg-surface-dark-muted border-b border-border dark:border-border-dark">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'border-b border-border dark:border-border-dark hover:bg-surface-muted/80 dark:hover:bg-surface-dark-muted/50 transition-colors',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  align = 'right',
  sticky,
  className,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  sticky?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'p-3',
        align === 'left' ? 'text-left' : 'text-right',
        sticky &&
          'sticky left-0 z-10 bg-surface dark:bg-surface-dark shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      {children}
    </td>
  );
}
