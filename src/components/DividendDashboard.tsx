import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Portfolio } from '../types';
import { getPositions } from '../utils/portfolio';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DividendApiRow {
  dividendRate: number;
  dividendYield: number;
  trailingAnnualDividendRate: number;
  exDividendDate: string | null;
}

interface Props {
  portfolio: Portfolio;
  livePrices: Record<string, number>;
}

interface HoldingRow {
  symbol: string;
  stockName: string;
  qty: number;
  cmp: number;
  divPerShare: number;
  yieldPct: number | null;
  annualIncome: number;
  exDate: string | null;
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function yieldDisplay(raw: number): number | null {
  if (raw == null || Number.isNaN(raw) || raw <= 0) return null;
  return Math.abs(raw) <= 1 ? raw * 100 : raw;
}

export function DividendDashboard({ portfolio, livePrices }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dividendMap, setDividendMap] = useState<Record<string, DividendApiRow>>({});

  const positions = getPositions(portfolio);
  const activePositions = positions.filter((p) => p.totalQty > 0);

  const symbolsKey = useMemo(
    () =>
      activePositions
        .map((p) => p.symbol)
        .sort()
        .join('|'),
    [activePositions],
  );

  const fetchDividends = useCallback(async () => {
    if (activePositions.length === 0) {
      setDividendMap({});
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        activePositions.map(async (p) => {
          try {
            const res = await fetch(`${PROXY_BASE}/api/dividends/${encodeURIComponent(p.symbol)}`);
            const data = (await res.json()) as DividendApiRow;
            return [p.symbol, data] as const;
          } catch {
            return [
              p.symbol,
              {
                dividendRate: 0,
                dividendYield: 0,
                trailingAnnualDividendRate: 0,
                exDividendDate: null,
              },
            ] as const;
          }
        }),
      );
      const next: Record<string, DividendApiRow> = {};
      for (const [sym, row] of results) next[sym] = row;
      setDividendMap(next);
    } finally {
      setLoading(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    fetchDividends();
  }, [fetchDividends]);

  const rows: HoldingRow[] = useMemo(() => {
    return activePositions.map((p) => {
      const d = dividendMap[p.symbol];
      const cmp = livePrices[p.symbol] ?? p.avgBuyPrice;
      const divRate = d?.dividendRate ?? 0;
      const trail = d?.trailingAnnualDividendRate ?? 0;
      const divPerShare = divRate > 0 ? divRate : trail;
      const annualIncome = divPerShare > 0 ? divPerShare * p.totalQty : 0;
      const apiYield = yieldDisplay(d?.dividendYield ?? 0);
      let yieldPct: number | null = apiYield;
      if (yieldPct == null && annualIncome > 0 && cmp > 0 && p.totalQty > 0) {
        yieldPct = (annualIncome / (cmp * p.totalQty)) * 100;
      }
      return {
        symbol: p.symbol,
        stockName: p.stockName,
        qty: p.totalQty,
        cmp,
        divPerShare,
        yieldPct,
        annualIncome,
        exDate: d?.exDividendDate ?? null,
      };
    });
  }, [activePositions, dividendMap, livePrices]);

  const totalAnnualIncome = useMemo(
    () => rows.reduce((s, r) => s + r.annualIncome, 0),
    [rows],
  );

  const totalPortfolioValue = useMemo(
    () => rows.reduce((s, r) => s + r.cmp * r.qty, 0),
    [rows],
  );

  const avgPortfolioYieldPct =
    totalPortfolioValue > 0 ? (totalAnnualIncome / totalPortfolioValue) * 100 : 0;

  const payingCount = rows.filter((r) => r.annualIncome > 0).length;

  const monthlyChartData = useMemo(
    () =>
      MONTH_LABELS.map((month) => ({
        month,
        income: totalAnnualIncome > 0 ? totalAnnualIncome / 12 : 0,
      })),
    [totalAnnualIncome],
  );

  const tooltipStyles = {
    contentStyle: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgb(55, 65, 81)',
      borderRadius: '8px',
      color: '#e5e7eb',
    },
    formatter: (value: unknown) => [`₹${fmt(Number(value) || 0)}`, 'Projected'],
    labelStyle: { color: '#9ca3af' },
  };

  const axisStroke = '#9ca3af';
  const gridStroke = '#374151';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors border-b border-gray-200 dark:border-gray-700"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Dividend Dashboard</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Estimated income from Yahoo Finance dividend fields · expands on refresh if holdings change
          </p>
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-lg shrink-0">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-6 space-y-6">
          {activePositions.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">
              No open positions — add holdings to see dividend estimates.
            </p>
          ) : (
            <>
              {loading && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">Loading dividend data…</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryTile
                  label="Total Annual Dividend Income"
                  value={`₹${fmt(totalAnnualIncome)}`}
                  sub="Across all holdings"
                />
                <SummaryTile
                  label="Avg. Portfolio Yield"
                  value={`${avgPortfolioYieldPct.toFixed(2)}%`}
                  sub="Income ÷ portfolio value"
                />
                <SummaryTile
                  label="Dividend-Paying Stocks"
                  value={`${payingCount}`}
                  sub={`of ${rows.length} holdings`}
                />
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Holdings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Stock</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          Div/Share (₹)
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Yield %</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          Annual Income
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          Ex-Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.symbol}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                              {r.stockName}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.symbol}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                            {r.divPerShare > 0 ? fmt(r.divPerShare) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                            {r.yieldPct != null ? `${r.yieldPct.toFixed(2)}%` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200">
                            {r.annualIncome > 0 ? `₹${fmt(r.annualIncome)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {r.exDate ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/20">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Monthly projected income (equal split)
                </h3>
                <div className="h-[260px] w-full">
                  {totalAnnualIncome <= 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                      No dividend-paying holdings detected.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} />
                        <XAxis dataKey="month" tick={{ fill: axisStroke, fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: axisStroke, fontSize: 11 }}
                          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmt(v)}`}
                          width={56}
                        />
                        <Tooltip {...tooltipStyles} />
                        <Bar dataKey="income" fill="#2563eb" radius={[6, 6, 0, 0]} name="Income" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
