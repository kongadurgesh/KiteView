import { useMemo, useState } from 'react';
import type {
  QuarterlyConsolidatedRawPeriod,
  QuarterlyPeriod,
  QuarterlyRawMetric,
  QuarterlyResults,
  QuarterlyResultsRaw,
} from '../../../types/analysisExtras';
import { fmtEps, fmtFinancialAmount } from '../../../lib/format';
import { isIndianSymbol } from '../../../lib/nseSymbol';

type AmountKey = 'revenue' | 'pretaxIncome' | 'netIncomeCommon';
type MetricKind = 'amount' | 'eps';
type ComparisonMode = 'qoq' | 'yoy';

const AMOUNT_METRICS: { key: AmountKey; label: string }[] = [
  { key: 'revenue', label: 'Total Revenue' },
  { key: 'pretaxIncome', label: 'Pretax Income' },
  { key: 'netIncomeCommon', label: 'Net Income' },
];

const CONSOLIDATED_RAW_ROWS: {
  key: keyof QuarterlyConsolidatedRawPeriod;
  kind: MetricKind;
  label: string;
}[] = [
  { key: 'quarterlyTotalRevenue', kind: 'amount', label: 'Total Revenue' },
  { key: 'quarterlyPretaxIncome', kind: 'amount', label: 'Pretax Income' },
  { key: 'quarterlyNetIncomeCommonStockholders', kind: 'amount', label: 'Net Income' },
  { key: 'quarterlyBasicEPS', kind: 'eps', label: 'Basic EPS' },
];

/** Most recent first (left), oldest last (right). */
function sortRecentToOldest(periods: QuarterlyPeriod[]): QuarterlyPeriod[] {
  return [...periods].sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function cellClass(
  value: number | null,
  compare: number | null,
  isFirstDataCol: boolean,
): string {
  if (!isFirstDataCol || value == null || compare == null) return '';
  if (value > compare) return 'bg-emerald-50 dark:bg-emerald-950/40';
  if (value < compare) return 'bg-red-50 dark:bg-red-950/40';
  return '';
}

function comparisonIndex(mode: ComparisonMode, count: number): number | null {
  if (mode === 'qoq') return count > 1 ? 1 : null;
  return count > 4 ? 4 : null;
}

function comparisonLabel(mode: ComparisonMode): string {
  return mode === 'qoq' ? 'QoQ' : 'YoY';
}

function comparisonHelp(mode: ComparisonMode): string {
  return mode === 'qoq'
    ? 'First column vs previous quarter'
    : 'First column vs same quarter last year';
}

function fmtMetric(
  key: AmountKey | 'basicEps',
  value: number | null,
  indian: boolean,
): string {
  if (key === 'basicEps') return fmtEps(value, indian);
  return fmtFinancialAmount(value, indian);
}

function rawMetricToNumber(value: QuarterlyRawMetric | undefined): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value && typeof value === 'object') {
    const raw = value.raw;
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  }
  return null;
}

function rawMetricCell(
  metric: QuarterlyRawMetric | undefined,
  kind: MetricKind,
  indian: boolean,
): { formatted: string; numeric: number | null } {
  const numeric = rawMetricToNumber(metric);
  const formatted = kind === 'eps' ? fmtEps(numeric, indian) : fmtFinancialAmount(numeric, indian);
  return { formatted, numeric };
}

export function QuarterlyResultsSection({
  symbol,
  data,
  rawData,
}: {
  symbol: string;
  data: QuarterlyResults;
  rawData?: QuarterlyResultsRaw;
}) {
  const indian = isIndianSymbol(symbol);
  const periods = useMemo(() => sortRecentToOldest(data.periods), [data.periods]);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('qoq');

  if (periods.length === 0) {
    return (
      <div className="card p-5">
        <p className="label-caps mb-2">Quarterly results</p>
        <p className="section-desc">Quarterly results unavailable for this symbol.</p>
      </div>
    );
  }

  const rawPeriods = rawData?.consolidated?.periods ?? [];
  const useRawTable = rawPeriods.length > 0;
  const selectedRawRows = CONSOLIDATED_RAW_ROWS;

  const visibleRawRows = useRawTable
    ? selectedRawRows.filter(({ key }) => rawPeriods.some((p) => p[key] != null))
    : [];

  if (useRawTable) {
    const compareIdx = comparisonIndex(comparisonMode, rawPeriods.length);
    return (
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="label-caps">Quarterly results</p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border dark:border-border-dark overflow-hidden">
              <button
                type="button"
                onClick={() => setComparisonMode('qoq')}
                className={`px-2.5 py-1 text-xs ${
                  comparisonMode === 'qoq'
                    ? 'bg-surface-2 dark:bg-surface-dark-2 text-ink dark:text-ink-dark'
                    : 'text-ink-muted dark:text-ink-dark-muted'
                }`}
              >
                QoQ
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('yoy')}
                className={`px-2.5 py-1 text-xs border-l border-border dark:border-border-dark ${
                  comparisonMode === 'yoy'
                    ? 'bg-surface-2 dark:bg-surface-dark-2 text-ink dark:text-ink-dark'
                    : 'text-ink-muted dark:text-ink-dark-muted'
                }`}
              >
                YoY
              </button>
            </div>
            <span className="text-xs text-ink-muted dark:text-ink-dark-muted" title={comparisonHelp(comparisonMode)}>
              Consolidated · {comparisonLabel(comparisonMode)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border dark:border-border-dark">
                <th className="text-left py-2 pr-3 text-xs font-medium text-ink-muted dark:text-ink-dark-muted uppercase tracking-wider">
                  Metric
                </th>
                {rawPeriods.map((p, i) => (
                  <th
                    key={p.endDate}
                    className={`text-right py-2 px-2 text-xs font-medium uppercase tracking-wider whitespace-nowrap ${
                      i === compareIdx
                        ? 'text-ink-primary dark:text-ink-dark-primary'
                        : 'text-ink-muted dark:text-ink-dark-muted'
                    }`}
                  >
                    {p.label}
                    {i === compareIdx && (
                      <span className="block text-[10px] font-normal normal-case text-ink-muted">(compare)</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRawRows.map(({ key, kind, label }) => {
                const compareMetric = compareIdx == null
                  ? undefined
                  : (rawPeriods[compareIdx]?.[key] as QuarterlyRawMetric | undefined);
                const compareNumeric = rawMetricToNumber(compareMetric);
                return (
                  <tr key={String(key)} className="border-b border-border/50 dark:border-border-dark/50 last:border-0">
                    <td className="py-2.5 pr-3 text-ink-secondary dark:text-ink-dark-secondary font-medium text-xs" title={String(key)}>
                      {label}
                    </td>
                    {rawPeriods.map((p, i) => {
                      const metric = p[key] as QuarterlyRawMetric | undefined;
                      const cell = rawMetricCell(metric, kind, indian);
                      return (
                        <td
                          key={`${p.endDate}-${String(key)}`}
                          className={`py-2 px-2 text-right font-mono tabular-nums text-xs ${cellClass(cell.numeric, compareNumeric, i === 0)}`}
                        >
                          <span>{cell.formatted}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const compareIdx = comparisonIndex(comparisonMode, periods.length);

  const rows: { key: AmountKey | 'basicEps'; label: string }[] = [
    ...AMOUNT_METRICS,
    { key: 'basicEps', label: 'Basic EPS' },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="label-caps">Quarterly results</p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border dark:border-border-dark overflow-hidden">
            <button
              type="button"
              onClick={() => setComparisonMode('qoq')}
              className={`px-2.5 py-1 text-xs ${
                comparisonMode === 'qoq'
                  ? 'bg-surface-2 dark:bg-surface-dark-2 text-ink dark:text-ink-dark'
                  : 'text-ink-muted dark:text-ink-dark-muted'
              }`}
            >
              QoQ
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('yoy')}
              className={`px-2.5 py-1 text-xs border-l border-border dark:border-border-dark ${
                comparisonMode === 'yoy'
                  ? 'bg-surface-2 dark:bg-surface-dark-2 text-ink dark:text-ink-dark'
                  : 'text-ink-muted dark:text-ink-dark-muted'
              }`}
            >
              YoY
            </button>
          </div>
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted" title={comparisonHelp(comparisonMode)}>
            {comparisonLabel(comparisonMode)}
          </span>
        </div>
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
                    i === compareIdx
                      ? 'text-ink-primary dark:text-ink-dark-primary'
                      : 'text-ink-muted dark:text-ink-dark-muted'
                  }`}
                >
                  {p.label}
                  {i === compareIdx && (
                    <span className="block text-[10px] font-normal normal-case text-ink-muted">(compare)</span>
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
                  const compare = compareIdx == null ? null : periods[compareIdx][key];
                  const val = p[key];
                  return (
                    <td
                      key={`${p.endDate}-${key}`}
                      className={`py-2.5 px-2 text-right font-mono tabular-nums text-xs ${cellClass(val, compare, i === 0)}`}
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
    </div>
  );
}
