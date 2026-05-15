import { cn } from '../../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 p-0.5 rounded-lg border border-border dark:border-border-dark bg-surface-muted dark:bg-surface-dark-muted',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors',
            value === opt.value
              ? 'bg-surface dark:bg-surface-dark text-accent shadow-sm'
              : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink-primary dark:hover:text-ink-dark-primary',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
