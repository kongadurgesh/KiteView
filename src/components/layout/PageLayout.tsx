import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { PageHeader } from '../ui/PageHeader';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
  /** @deprecated Use align="center" */
  centered?: boolean;
  align?: 'start' | 'center';
  narrow?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  title,
  description,
  headerAction,
  centered,
  align,
  narrow,
  className,
}: PageLayoutProps) {
  const headerAlign = align ?? (centered ? 'center' : 'start');

  return (
    <div
      className={cn(
        'w-full mx-auto flex flex-col items-stretch',
        narrow ? 'max-w-5xl' : 'max-w-7xl',
        className,
      )}
    >
      {title && (
        <PageHeader
          title={title}
          description={description}
          action={headerAction}
          align={headerAlign}
        />
      )}
      {children}
    </div>
  );
}
