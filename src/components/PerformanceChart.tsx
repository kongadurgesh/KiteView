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
import { Portfolio } from '../types';
import {
  fetchHistoricalPrices,
  computeDailyPortfolioValue,
  normalizeToPercent,
} from '../utils/portfolioChart';
import { getPositions } from '../utils/portfolio';

const INDICES = [
  { key: 'nifty50', symbol: '^NSEI', label: 'Nifty 50', color: '#f59e0b' },
  { key: 'bankNifty', symbol: '^NSEBANK', label: 'Bank Nifty', color: '#8b5cf6' },
  { key: 'midcap50', symbol: '^NSEMDCP50', label: 'Midcap 50', color: '#06b6d4' },
  { key: 'smallcap100', symbol: 'NIFSMCP100.NS', label: 'Smallcap 100', color: '#f43f5e' },
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
}

export function PerformanceChart({ portfolio }: Props) {
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
  const activeSymbols = positions
    .filter((p) => p.totalQty > 0)
    .map((p) => p.symbol);

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
    if (portfolioSeries.length === 0) return [];

    const dates = portfolioSeries.map((p) => p.date);
    const portfolioValues = portfolioSeries.map((p) => p.portfolioValue);

    const activeIndices = INDICES.filter((idx) => selectedIndices.has(idx.key));

    if (viewMode === 'percent') {
      const pctPortfolio = normalizeToPercent(portfolioValues);

      const indexPcts: Record<string, number[]> = {};
      for (const idx of activeIndices) {
        const raw = dates.map((d) => indexSeries[idx.key]?.[d] ?? null);
        const firstValid = raw.findIndex((v) => v !== null);
        if (firstValid === -1) {
          indexPcts[idx.key] = dates.map(() => 0);
          continue;
        }
        const base = raw[firstValid]!;
        indexPcts[idx.key] = raw.map((v, i) => {
          if (v === null || i < firstValid) return 0;
          return parseFloat((((v - base) / base) * 100).toFixed(2));
        });
      }

      return dates.map((date, i) => {
        const point: Record<string, number | string> = {
          date,
          portfolio: pctPortfolio[i],
        };
        for (const idx of activeIndices) {
          point[idx.key] = indexPcts[idx.key][i];
        }
        return point;
      });
    }

    return dates.map((date, i) => {
      const point: Record<string, number | string> = {
        date,
        portfolio: portfolioValues[i],
      };
      for (const idx of activeIndices) {
        point[idx.key] = indexSeries[idx.key]?.[date] ?? 0;
      }
      return point;
    });
  }, [portfolioSeries, indexSeries, selectedIndices, viewMode]);

  const hasAnyIndex = INDICES.some((idx) => selectedIndices.has(idx.key));

  if (activeSymbols.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">
          Add holdings to see portfolio performance chart.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Performance
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  timeRange === tr.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tr.label}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={() =>
                setViewMode((m) => (m === 'percent' ? 'absolute' : 'percent'))
              }
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {viewMode === 'percent' ? '% Return' : 'Absolute'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
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
                    ? 'bg-gray-50 text-gray-800 border-gray-300'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: active ? idx.color : '#d1d5db',
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
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">
            No data available for the selected range.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                border: '1px solid #e5e7eb',
                fontSize: 12,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
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
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              yAxisId={viewMode === 'absolute' ? 'left' : 'left'}
              type="monotone"
              dataKey="portfolio"
              stroke={PORTFOLIO_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
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
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
