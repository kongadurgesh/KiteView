import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Portfolio } from '../../../types';
import {
  fetchHistoricalPrices,
  computeDailyPortfolioValue,
} from '../../../utils/portfolioChart';
import { getPositions } from '../../../utils/portfolio';

const INDICES = [
  { key: 'nifty50', symbol: '^NSEI', label: 'Nifty 50', color: '#f59e0b' },
  { key: 'bankNifty', symbol: '^NSEBANK', label: 'Bank Nifty', color: '#8b5cf6' },
  { key: 'midcap50', symbol: '^NSEMDCP50', label: 'Midcap 50', color: '#06b6d4' },
  { key: 'nifty200', symbol: '^CNX200', label: 'Nifty 200', color: '#f43f5e' },
] as const;

type IndexKey = (typeof INDICES)[number]['key'];
type ViewMode = 'percent' | 'absolute';
type TimeRange = '1mo' | '3mo' | '6mo' | '1y';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
];

const PORTFOLIO_COLOR = '#2563eb';

interface Props {
  portfolio: Portfolio;
  embedded?: boolean;
}

export function PerformanceChart({ portfolio, embedded }: Props) {
  const [selectedIndices, setSelectedIndices] = useState<Set<IndexKey>>(
    new Set(['nifty50']),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('percent');
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');
  const [loading, setLoading] = useState(false);

  const [portfolioSeries, setPortfolioSeries] = useState<
    { date: string; portfolioValue: number }[]
  >([]);
  const [indexSeries, setIndexSeries] = useState<
    Record<string, Record<string, number>>
  >({});

  const positions = getPositions(portfolio);
  const activeSymbols: string[] = [];
  for (const p of positions) {
    if (p.totalQty > 0) activeSymbols.push(p.symbol);
  }

  const symbolsKey = activeSymbols.sort().join(',');
  const indicesKey = Array.from(selectedIndices).sort().join(',');

  const loadData = useCallback(async () => {
    if (activeSymbols.length === 0) return;
    setLoading(true);
    try {
      const indexSymbols = INDICES
        .filter((idx) => selectedIndices.has(idx.key))
        .map((idx) => idx.symbol);

      const allSymbols = [...activeSymbols, ...indexSymbols];
      const prices = await fetchHistoricalPrices(allSymbols, timeRange);

      const pSeries = computeDailyPortfolioValue(portfolio, prices);
      setPortfolioSeries(pSeries);

      const idxData: Record<string, Record<string, number>> = {};
      for (const idx of INDICES) {
        if (prices[idx.symbol]) {
          idxData[idx.key] = prices[idx.symbol];
        }
      }
      setIndexSeries(idxData);
    } finally {
      setLoading(false);
    }
  }, [symbolsKey, indicesKey, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleIndex = (key: IndexKey) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    for (const p of portfolioSeries) allDates.add(p.date);
    for (const key of Object.keys(indexSeries)) {
      for (const d of Object.keys(indexSeries[key])) allDates.add(d);
    }
    const dates = Array.from(allDates).sort();
    if (dates.length === 0) return [];

    const portfolioMap = new Map(
      portfolioSeries.map((p) => [p.date, p.portfolioValue]),
    );
    const activeIndices = INDICES.filter((idx) => selectedIndices.has(idx.key));

    if (viewMode === 'percent') {
      const pBase =
        portfolioSeries.length > 0 ? portfolioSeries[0].portfolioValue : 1;

      const indexBases: Record<string, number> = {};
      for (const idx of activeIndices) {
        const firstDate = dates.find(
          (d) => indexSeries[idx.key]?.[d] != null,
        );
        indexBases[idx.key] = firstDate ? indexSeries[idx.key][firstDate] : 1;
      }

      return dates.map((date) => {
        const point: Record<string, number | string | undefined> = { date };
        const pVal = portfolioMap.get(date);
        if (pVal != null && pBase !== 0) {
          point.portfolio = parseFloat(
            (((pVal - pBase) / pBase) * 100).toFixed(2),
          );
        }
        for (const idx of activeIndices) {
          const val = indexSeries[idx.key]?.[date];
          const base = indexBases[idx.key];
          if (val != null && base !== 0) {
            point[idx.key] = parseFloat(
              (((val - base) / base) * 100).toFixed(2),
            );
          }
        }
        return point;
      });
    }

    return dates.map((date) => {
      const point: Record<string, number | string | undefined> = { date };
      const pVal = portfolioMap.get(date);
      if (pVal != null) point.portfolio = pVal;
      for (const idx of activeIndices) {
        const val = indexSeries[idx.key]?.[date];
        if (val != null) point[idx.key] = val;
      }
      return point;
    });
  }, [portfolioSeries, indexSeries, selectedIndices, viewMode]);

  const hasAnyIndex = INDICES.some((idx) => selectedIndices.has(idx.key));

  if (activeSymbols.length === 0) {
    return (
      <p className={`text-gray-400 dark:text-gray-500 text-sm ${embedded ? 'text-center py-6' : ''}`}>
        Add holdings to see portfolio performance chart.
      </p>
    );
  }

  const shell = embedded ? '' : 'bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-6';

  return (
    <div className={shell}>
      <div className="flex flex-col gap-4 mb-4">
        <div className={`flex flex-col gap-3 ${embedded ? '' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
          {!embedded && (
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Performance
            </h3>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === tr.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tr.label}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button
              onClick={() =>
                setViewMode((m) => (m === 'percent' ? 'absolute' : 'percent'))
              }
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {viewMode === 'percent' ? '% Return' : 'Absolute'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/30 text-blue-400 border border-blue-800"
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: PORTFOLIO_COLOR }}
            />
            My Portfolio
          </span>
          {INDICES.map((idx) => {
            const active = selectedIndices.has(idx.key);
            return (
              <button
                key={idx.key}
                onClick={() => toggleIndex(idx.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                    : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: active ? idx.color : '#6b7280',
                  }}
                />
                {idx.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="size-8 border-4 border-blue-800/50 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No data available for the selected range.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(d: string) => {
                const [, m, day] = d.split('-');
                const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${parseInt(day)} ${months[parseInt(m)]}`;
              }}
              minTickGap={40}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(v: number) =>
                viewMode === 'percent'
                  ? `${v.toFixed(1)}%`
                  : v >= 100000
                    ? `${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(1)}K`
                      : v.toFixed(0)
              }
              width={60}
            />
            {viewMode === 'absolute' && hasAnyIndex && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)
                }
                width={60}
              />
            )}
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #374151',
                fontSize: 12,
                backgroundColor: '#1f2937',
                color: '#e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
              formatter={(value, name) => {
                const v = Number(value);
                const n = String(name);
                const label =
                  n === 'portfolio'
                    ? 'My Portfolio'
                    : INDICES.find((i) => i.key === n)?.label ?? n;
                const formatted =
                  viewMode === 'percent'
                    ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
                    : v.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      });
                return [formatted, label];
              }}
              labelFormatter={(label) => {
                const d = new Date(String(label));
                return d.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'portfolio'
                  ? 'My Portfolio'
                  : INDICES.find((i) => i.key === value)?.label ?? value
              }
              wrapperStyle={{ fontSize: 12, color: '#d1d5db' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="portfolio"
              stroke={PORTFOLIO_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
            {INDICES.filter((idx) => selectedIndices.has(idx.key)).map(
              (idx) => (
                <Line
                  key={idx.key}
                  yAxisId={
                    viewMode === 'absolute' && hasAnyIndex ? 'right' : 'left'
                  }
                  type="monotone"
                  dataKey={idx.key}
                  stroke={idx.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  strokeDasharray="5 3"
                  connectNulls
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
