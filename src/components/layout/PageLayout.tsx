import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
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
  const navigate = useNavigate();
  const location = useLocation();
  const headerAlign = align ?? (centered ? 'center' : 'start');
  const isOverview = location.pathname === '/';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const backButton = (
    <Button variant="ghost" size="sm" onClick={handleBack} aria-label="Go back" className="-ml-1 px-2">
      <span aria-hidden className="text-2xl leading-none">←</span>
    </Button>
  );

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
          leading={isOverview ? undefined : backButton}
          action={headerAction}
          align={headerAlign}
        />
      )}
      {children}
    </div>
  );
}
