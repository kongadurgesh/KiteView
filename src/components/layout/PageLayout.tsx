import { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { PageHeader } from '../ui/PageHeader';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
  centered?: boolean;
  narrow?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  title,
  description,
  headerAction,
  centered,
  narrow,
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto flex flex-col items-center',
        narrow ? 'max-w-5xl' : 'max-w-7xl',
        className,
      )}
    >
      {title && (
        <PageHeader
          title={title}
          description={description}
          action={headerAction}
          centered={centered}
        />
      )}
      {children}
    </div>
  );
}
