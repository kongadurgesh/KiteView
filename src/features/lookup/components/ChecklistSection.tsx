import type { ChecklistItem } from '../analysisScores';

export function ChecklistSection({ items }: { items: ChecklistItem[] }) {
  const passed = items.filter((i) => i.pass).length;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="label-caps">Investment checklist</p>
        <span className="text-sm font-mono text-ink-muted">
          {passed}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-start gap-3 text-sm py-1.5 border-b border-border/50 dark:border-border-dark/50 last:border-0"
          >
            <span
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                item.pass
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-surface-muted dark:bg-surface-dark-muted text-ink-muted'
              }`}
            >
              {item.pass ? '✓' : '—'}
            </span>
            <span className="flex-1 text-ink-primary dark:text-ink-dark-primary">
              {item.label}
              {item.detail && (
                <span className="text-ink-muted dark:text-ink-dark-muted ml-1">({item.detail})</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
