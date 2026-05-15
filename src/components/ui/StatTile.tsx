import { cn } from '../../lib/cn';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}

export function StatTile({ label, value, sub, valueClassName }: StatTileProps) {
  return (
    <div className="card-muted px-4 py-3 text-center">
      <p className="label-caps mb-1">{label}</p>
      <p className={cn('text-lg font-bold font-mono tabular-nums text-ink-primary dark:text-ink-dark-primary', valueClassName)}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5">{sub}</p>}
    </div>
  );
}
