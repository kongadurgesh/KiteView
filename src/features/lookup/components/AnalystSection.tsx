import type { AnalysisRecommendations } from '../../../types/analysisExtras';

export function AnalystSection({ recs }: { recs: AnalysisRecommendations }) {
  const total = recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell;
  if (total === 0) return null;

  const rows = [
    { label: 'Strong buy', count: recs.strongBuy, color: 'bg-emerald-600' },
    { label: 'Buy', count: recs.buy, color: 'bg-emerald-400' },
    { label: 'Hold', count: recs.hold, color: 'bg-gray-400' },
    { label: 'Sell', count: recs.sell, color: 'bg-red-400' },
    { label: 'Strong sell', count: recs.strongSell, color: 'bg-red-600' },
  ].filter((r) => r.count > 0);

  return (
    <div className="card p-5">
      <p className="label-caps mb-3">Analyst recommendations</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-ink-secondary shrink-0">{r.label}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-muted dark:bg-surface-dark-muted overflow-hidden">
              <div
                className={`h-full ${r.color}`}
                style={{ width: `${(r.count / total) * 100}%` }}
              />
            </div>
            <span className="font-mono w-8 text-right">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
