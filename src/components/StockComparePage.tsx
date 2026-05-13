import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

const CHART_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#f43f5e'];

type RangeKey = '1mo' | '3mo' | '6mo' | '1y';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
];

interface Suggestion {
  symbol: string;
  shortname: string;
  exchange: string;
}

interface StockStats {
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  beta: number | null;
  dividendYield: number | null;
  fiftyTwoWeekChange: number | null;
  marketCap: number | null;
  shortName: string;
  regularMarketPrice: number | null;
  sector: string;
}

function fmtInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMarketCap(raw: number | null): string {
  if (raw == null || raw <= 0) return '—';
  const cr = raw / 1e7;
  if (cr >= 10000) return `${(cr / 10000).toFixed(2)} L Cr`;
  return `${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

function fmtPct(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = Math.abs(raw) <= 1 ? raw * 100 : raw;
  return `${v.toFixed(2)}%`;
}

function fmtRatio(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  return raw.toFixed(2);
}

function parseChartPayload(data: unknown): { date: string; close: number }[] {
  const chart = (
    data as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
      };
    }
  ).chart?.result?.[0];
  if (!chart) return [];
  const ts = chart.timestamp ?? [];
  const closes = chart.indicators?.quote?.[0]?.close ?? [];
  const out: { date: string; close: number }[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || c === 0) continue;
    out.push({
      date: new Date(ts[i] * 1000).toISOString().split('T')[0],
      close: c,
    });
  }
  return out;
}

function mergeNormalized(
  seriesMap: Record<string, { date: string; close: number }[]>,
  orderedSymbols: string[],
): Record<string, string | number>[] {
  const symbols = orderedSymbols.filter((s) => (seriesMap[s]?.length ?? 0) > 0);
  if (symbols.length === 0) return [];

  let common = new Set(seriesMap[symbols[0]].map((p) => p.date));
  for (let i = 1; i < symbols.length; i++) {
    const ds = new Set(seriesMap[symbols[i]].map((p) => p.date));
    common = new Set([...common].filter((d) => ds.has(d)));
  }
  if (common.size === 0) return [];

  const sorted = [...common].sort();
  const lookup: Record<string, Record<string, number>> = {};
  for (const s of symbols) {
    lookup[s] = {};
    for (const p of seriesMap[s]) lookup[s][p.date] = p.close;
  }

  const first = sorted[0];
  const base: Record<string, number> = {};
  for (const s of symbols) base[s] = lookup[s][first] ?? 0;

  return sorted.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of symbols) {
      const close = lookup[s][date];
      const b = base[s];
      row[s] = b > 0 && close != null ? (close / b - 1) * 100 : 0;
    }
    return row;
  });
}

export function StockComparePage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [range, setRange] = useState<RangeKey>('1y');
  const [chartRows, setChartRows] = useState<Record<string, string | number>[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [statsBySymbol, setStatsBySymbol] = useState<Record<string, StockStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(true);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
  }, []);

  const addSymbol = useCallback((sym: string) => {
    const trimmed = sym.trim();
    if (!trimmed) return;
    const finalSym = trimmed.includes('.') ? trimmed : `${trimmed}.NS`;
    setSymbols((prev) => {
      if (prev.includes(finalSym) || prev.length >= 4) return prev;
      return [...prev, finalSym];
    });
    setInput('');
    setSuggestions([]);
    setShowDropdown(false);
  }, []);

  const removeSymbol = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
    setStatsBySymbol((prev) => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  }, []);

  useEffect(() => {
    if (symbols.length === 0) {
      setChartRows([]);
      return;
    }

    let cancelled = false;
    async function loadCharts() {
      setChartLoading(true);
      try {
        const results = await Promise.all(
          symbols.map(async (sym) => {
            const res = await fetch(
              `${PROXY_BASE}/api/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`,
            );
            const data = await res.json();
            return { sym, series: parseChartPayload(data) };
          }),
        );
        if (cancelled) return;
        const map: Record<string, { date: string; close: number }[]> = {};
        for (const r of results) map[r.sym] = r.series;
        setChartRows(mergeNormalized(map, symbols));
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    loadCharts();
    return () => {
      cancelled = true;
    };
  }, [symbols, range]);

  useEffect(() => {
    if (symbols.length === 0) {
      setStatsBySymbol({});
      return;
    }

    let cancelled = false;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const entries = await Promise.all(
          symbols.map(async (sym) => {
            try {
              const res = await fetch(`${PROXY_BASE}/api/stats/${encodeURIComponent(sym)}`);
              const data = (await res.json()) as StockStats;
              return [sym, data] as const;
            } catch {
              return [
                sym,
                {
                  pe: null,
                  forwardPE: null,
                  pb: null,
                  beta: null,
                  dividendYield: null,
                  fiftyTwoWeekChange: null,
                  marketCap: null,
                  shortName: sym,
                  regularMarketPrice: null,
                  sector: '',
                } satisfies StockStats,
              ] as const;
            }
          }),
        );
        if (cancelled) return;
        const next: Record<string, StockStats> = {};
        for (const [sym, st] of entries) next[sym] = st;
        setStatsBySymbol(next);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [symbols]);

  const comparisonRows = useMemo(
    () => [
      {
        label: 'CMP',
        fmt: (s: string) => {
          const p = statsBySymbol[s]?.regularMarketPrice;
          return p != null ? fmtInr(p) : '—';
        },
      },
      { label: 'Market Cap', fmt: (s: string) => fmtMarketCap(statsBySymbol[s]?.marketCap ?? null) },
      { label: 'P/E', fmt: (s: string) => fmtRatio(statsBySymbol[s]?.pe ?? null) },
      { label: 'Forward P/E', fmt: (s: string) => fmtRatio(statsBySymbol[s]?.forwardPE ?? null) },
      { label: 'P/B', fmt: (s: string) => fmtRatio(statsBySymbol[s]?.pb ?? null) },
      { label: 'Beta', fmt: (s: string) => fmtRatio(statsBySymbol[s]?.beta ?? null) },
      { label: 'Div Yield', fmt: (s: string) => fmtPct(statsBySymbol[s]?.dividendYield ?? null) },
      { label: '52W Change', fmt: (s: string) => fmtPct(statsBySymbol[s]?.fiftyTwoWeekChange ?? null) },
      { label: 'Sector', fmt: (s: string) => statsBySymbol[s]?.sector || '—' },
    ],
    [statsBySymbol],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInput(val);
    fetchSuggestions(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || symbols.length >= 4) return;
    addSymbol(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      const sym = suggestions[activeIdx].symbol;
      if (symbols.length < 4 && !symbols.includes(sym)) addSymbol(sym);
    }
  };

  const tooltipStyles = {
    contentStyle: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgb(55, 65, 81)',
      borderRadius: '8px',
    },
    labelStyle: { color: '#e5e7eb' },
    itemStyle: { color: '#e5e7eb' },
  };

  const axisStroke = '#9ca3af';
  const gridStroke = '#374151';

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 pb-10">
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xl mx-auto">
        Add up to four stocks to compare normalized price performance and key statistics side by side.
      </p>

      <div ref={wrapperRef} className="relative w-full max-w-lg mx-auto">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
          {symbols.map((sym, i) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-sm font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
            >
              <span style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{sym}</span>
              <button
                type="button"
                onClick={() => removeSymbol(sym)}
                className="p-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300 transition-colors"
                aria-label={`Remove ${sym}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {symbols.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic py-1">No stocks selected</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={symbols.length >= 4 ? 'Maximum 4 stocks' : 'Search to add stock…'}
            disabled={symbols.length >= 4}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={symbols.length >= 4 || !input.trim()}
            className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </form>

        {showDropdown && symbols.length < 4 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic">No matches</li>
            ) : (
              suggestions.map((s, idx) => (
                <li
                  key={s.symbol}
                  className={`px-4 py-2.5 cursor-pointer flex justify-between items-center text-sm
                    ${idx === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  onMouseDown={() => {
                    if (!symbols.includes(s.symbol)) addSymbol(s.symbol);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{s.symbol}</span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">{s.shortname}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{s.exchange === 'NSI' ? 'NSE' : 'BSE'}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {symbols.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Normalized % change</h3>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/80 rounded-lg p-1">
              {RANGE_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    range === key
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[320px] w-full">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">Loading chart…</div>
            ) : chartRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                Not enough overlapping data for this range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: axisStroke, fontSize: 11 }}
                    tickFormatter={(d: string) => d.slice(5)}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: axisStroke, fontSize: 11 }}
                    tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                    width={48}
                  />
                  <Tooltip
                    {...tooltipStyles}
                    formatter={(value: unknown) => [`${Number(value).toFixed(2)}%`, '']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af' }} />
                  {symbols.map((sym, i) => (
                    <Line
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={statsBySymbol[sym]?.shortName ?? sym}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {symbols.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Comparison</h3>
            {statsLoading && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Updating statistics…</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    Metric
                  </th>
                  {symbols.map((sym, i) => (
                    <th
                      key={sym}
                      className="text-right px-4 py-3 font-semibold whitespace-nowrap text-gray-800 dark:text-gray-100"
                      style={{ borderBottom: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}
                    >
                      <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{sym}</span>
                      <span className="font-semibold">{statsBySymbol[sym]?.shortName ?? sym}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {row.label}
                    </td>
                    {symbols.map((sym) => (
                      <td
                        key={`${row.label}-${sym}`}
                        className="px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200"
                      >
                        {row.fmt(sym)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {symbols.length === 1 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          Add at least one more stock to see the comparison chart and table.
        </div>
      )}
    </div>
  );
}
