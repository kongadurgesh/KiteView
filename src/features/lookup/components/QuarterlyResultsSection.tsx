import { useMemo } from 'react';
import type { QuarterlyPeriod, QuarterlyResults } from '../../../types/analysisExtras';
import { fmtEps, fmtFinancialAmount } from '../../../lib/format';
import { isIndianSymbol } from '../../../lib/nseSymbol';

type AmountKey = 'revenue' | 'pretaxIncome' | 'netIncomeCommon';

const AMOUNT_METRICS: { key: AmountKey; label: string }[] = [
  { key: 'revenue', label: 'Total Revenue' },
  { key: 'pretaxIncome', label: 'Pretax Income' },
  { key: 'netIncomeCommon', label: 'Net Income' },
];

function basisLabel(basis: QuarterlyResults['basis']): string {
  if (basis === 'consolidated') return 'Consolidated';
  if (basis === 'standalone') return 'Standalone';
  return 'Quarterly results';
}

/** Most recent first (left), oldest last (right). */
function sortRecentToOldest(periods: QuarterlyPeriod[]): QuarterlyPeriod[] {
  return [...periods].sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function cellClass(
  value: number | null,
  base: number | null,
  isBaseCol: boolean,
): string {
  if (isBaseCol || value == null || base == null) return '';
  if (value > base) return 'bg-emerald-50 dark:bg-emerald-950/40';
  if (value < base) return 'bg-red-50 dark:bg-red-950/40';
  return '';
}

function fmtMetric(
  key: AmountKey | 'basicEps',
  value: number | null,
  indian: boolean,
): string {
  if (key === 'basicEps') return fmtEps(value, indian);
  return fmtFinancialAmount(value, indian);
}

export function QuarterlyResultsSection({
  symbol,
  data,
}: {
  symbol: string;
  data: QuarterlyResults;
}) {
  const indian = isIndianSymbol(symbol);
  const currencyLabel = indian ? 'INR' : 'USD';
  const periods = useMemo(() => sortRecentToOldest(data.periods), [data.periods]);
  const { basis } = data;

  if (periods.length === 0) {
    return (
      <div className="card p-5">
        <p className="label-caps mb-2">Quarterly results</p>
        <p className="section-desc">Quarterly results unavailable for this symbol.</p>
      </div>
    );
  }

  /** Oldest quarter is rightmost (base); left columns are newer and get green/red. */
  const baseIdx = periods.length - 1;

  const rows: { key: AmountKey | 'basicEps'; label: string }[] = [
    ...AMOUNT_METRICS,
    { key: 'basicEps', label: 'Basic EPS' },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="label-caps">Quarterly results</p>
        <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
          {basisLabel(basis)} · recent → oldest
        </span>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-border dark:border-border-dark">
              <th className="text-left py-2 pr-3 text-xs font-medium text-ink-muted dark:text-ink-dark-muted uppercase tracking-wider">
                Metric
              </th>
              {periods.map((p, i) => (
                <th
                  key={p.endDate}
                  className={`text-right py-2 px-2 text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                    i === baseIdx
                      ? 'text-ink-primary dark:text-ink-dark-primary'
                      : 'text-ink-muted dark:text-ink-dark-muted'
                  }`}
                >
                  {p.label}
                  {i === baseIdx && (
                    <span className="block text-[10px] font-normal normal-case text-ink-muted">(base)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <tr key={key} className="border-b border-border/50 dark:border-border-dark/50 last:border-0">
                <td className="py-2.5 pr-3 text-ink-secondary dark:text-ink-dark-secondary font-medium">{label}</td>
                {periods.map((p, i) => {
                  const base = periods[baseIdx][key];
                  const val = p[key];
                  return (
                    <td
                      key={`${p.endDate}-${key}`}
                      className={`py-2.5 px-2 text-right font-mono tabular-nums text-xs ${cellClass(val, base, i === baseIdx)}`}
                    >
                      {fmtMetric(key, val, indian)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-3">
        Amounts in {currencyLabel}. Green / red vs oldest quarter (right). Source: Yahoo Finance.
      </p>
    </div>
  );
}
