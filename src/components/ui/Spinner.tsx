import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-8 border-2 border-accent-muted border-t-accent rounded-full animate-spin',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingBlock({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner />
      <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{message}</p>
    </div>
  );
}
