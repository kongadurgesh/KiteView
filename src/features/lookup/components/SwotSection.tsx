import type { SwotAnalysis } from '../swotEngine';

const QUADRANTS: { key: keyof SwotAnalysis; title: string; border: string; bg: string }[] = [
  { key: 'strengths', title: 'Strengths', border: 'border-emerald-200 dark:border-emerald-900/60', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  { key: 'weaknesses', title: 'Weaknesses', border: 'border-red-200 dark:border-red-900/60', bg: 'bg-red-50/50 dark:bg-red-950/20' },
  { key: 'opportunities', title: 'Opportunities', border: 'border-blue-200 dark:border-blue-900/60', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
  { key: 'threats', title: 'Threats', border: 'border-amber-200 dark:border-amber-900/60', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
];

export function SwotSection({ swot }: { swot: SwotAnalysis }) {
  return (
    <div className="card p-5">
      <p className="label-caps mb-1">SWOT analysis</p>
      <p className="text-xs text-ink-muted dark:text-ink-dark-muted mb-4">
        Automated signals from market data — not investment advice.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUADRANTS.map(({ key, title, border, bg }) => (
          <div key={key} className={`rounded-xl border p-4 ${border} ${bg}`}>
            <h3 className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary mb-2">{title}</h3>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto text-sm text-ink-secondary dark:text-ink-dark-secondary">
              {swot[key].map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ink-muted shrink-0">•</span>
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
