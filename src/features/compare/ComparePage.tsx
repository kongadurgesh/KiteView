import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { fetchChartBatch, fetchStatsBatch } from '../../services/apiBatch';
import { PageLayout } from '../../components/layout/PageLayout';
import { EmptyState } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import { fmtInr, fmtMarketCap, fmtPct, fmtRatio } from '../../lib/format';
import type { StockStats } from '../../types/stockStats';

import { API_BASE } from '../../lib/apiBase';

const BENCHMARK_STRIKE = '#64748b';

type BenchmarkMode = 'off' | 'nifty' | 'sensex';

const BENCHMARK_OPTIONS: { mode: BenchmarkMode; label: string; sym: string; dataKey: string }[] = [
  { mode: 'off', label: 'No index', sym: '', dataKey: '' },
  { mode: 'nifty', label: 'Nifty 50', sym: '^NSEI', dataKey: 'NIFTY_50' },
  { mode: 'sensex', label: 'Sensex', sym: '^BSESN', dataKey: 'SENSEX_IDX' },
];

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
  benchmark?: { key: string; points: { date: string; close: number }[] } | null,
): Record<string, string | number>[] {
  const symbols = orderedSymbols.filter((s) => (seriesMap[s]?.length ?? 0) > 0);
  if (symbols.length === 0) return [];

  let common = new Set(seriesMap[symbols[0]].map((p) => p.date));
  for (let i = 1; i < symbols.length; i++) {
    const ds = new Set(seriesMap[symbols[i]].map((p) => p.date));
    common = new Set([...common].filter((d) => ds.has(d)));
  }

  const benchLookup: Record<string, number> = {};
  if (benchmark?.points.length) {
    const ds = new Set(benchmark.points.map((p) => p.date));
    common = new Set([...common].filter((d) => ds.has(d)));
    for (const p of benchmark.points) benchLookup[p.date] = p.close;
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
  const benchBase = benchmark ? benchLookup[first] ?? 0 : 0;

  return sorted.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of symbols) {
      const close = lookup[s][date];
      const b = base[s];
      row[s] = b > 0 && close != null ? (close / b - 1) * 100 : 0;
    }
    if (benchmark && benchBase > 0) {
      const bc = benchLookup[date];
      row[benchmark.key] = bc != null ? (bc / benchBase - 1) * 100 : 0;
    }
    return row;
  });
}

function computeRowHighlights(
  syms: string[],
  rank: 'none' | 'higher' | 'lower',
  value: (s: string) => number | null,
): Record<string, 'best' | 'worst'> {
  if (rank === 'none' || syms.length < 2) return {};
  const pairs = syms
    .map((sym) => ({ sym, v: value(sym) }))
    .filter((p): p is { sym: string; v: number } => p.v != null && typeof p.v === 'number' && !Number.isNaN(p.v));
  if (pairs.length < 2) return {};
  const values = pairs.map((p) => p.v);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return {};
  const out: Record<string, 'best' | 'worst'> = {};
  for (const { sym, v } of pairs) {
    if (rank === 'higher') {
      if (v === max) out[sym] = 'best';
      else if (v === min) out[sym] = 'worst';
    } else {
      if (v === min) out[sym] = 'best';
      else if (v === max) out[sym] = 'worst';
    }
  }
  return out;
}

function subscribeDarkMode(onStoreChange: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(onStoreChange);
  mo.observe(el, { attributes: true, attributeFilter: ['class'] });
  return () => mo.disconnect();
}

function getDarkModeSnapshot() {
  return document.documentElement.classList.contains('dark');
}

export function StockComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [range, setRange] = useState<RangeKey>('1y');
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>('off');
  const [chartRows, setChartRows] = useState<Record<string, string | number>[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [statsBySymbol, setStatsBySymbol] = useState<Record<string, StockStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isDark = useSyncExternalStore(subscribeDarkMode, getDarkModeSnapshot, () => false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const symbolParam = searchParams.get('symbol');

  useEffect(() => {
    if (!symbolParam?.trim()) return;
    const raw = symbolParam.trim();
    const finalSym = raw.includes('.') ? raw : `${raw}.NS`;
    setSymbols((prev) => {
      if (prev.includes(finalSym) || prev.length >= 4) return prev;
      return [finalSym, ...prev];
    });
    setSearchParams({}, { replace: true });
  }, [symbolParam, setSearchParams]);

  const fetchSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
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

    const benchOpt = BENCHMARK_OPTIONS.find((o) => o.mode === benchmarkMode && o.mode !== 'off');
    const showChart = symbols.length >= 2 || (symbols.length >= 1 && benchOpt);
    if (!showChart) {
      setChartRows([]);
      return;
    }

    let cancelled = false;
    async function loadCharts() {
      setChartLoading(true);
      try {
        const chartSymbols = benchOpt ? [...symbols, benchOpt.sym] : [...symbols];
        const charts = await fetchChartBatch(chartSymbols, range, '1d');
        if (cancelled) return;
        const map: Record<string, { date: string; close: number }[]> = {};
        for (const sym of symbols) {
          map[sym] = parseChartPayload(charts[sym]);
        }

        let benchArg: { key: string; points: { date: string; close: number }[] } | null = null;
        if (benchOpt) {
          const pts = parseChartPayload(charts[benchOpt.sym]);
          if (pts.length > 0) benchArg = { key: benchOpt.dataKey, points: pts };
        }
        if (cancelled) return;
        setChartRows(mergeNormalized(map, symbols, benchArg));
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    loadCharts();
    return () => {
      cancelled = true;
    };
  }, [symbols, range, benchmarkMode]);

  useEffect(() => {
    if (symbols.length === 0) {
      setStatsBySymbol({});
      return;
    }

    let cancelled = false;
    async function loadStats() {
      setStatsLoading(true);
      try {
        const batch = await fetchStatsBatch<StockStats>(symbols);
        if (cancelled) return;
        const empty: StockStats = {
          pe: null,
          forwardPE: null,
          pb: null,
          beta: null,
          fiftyTwoWeekChange: null,
          marketCap: null,
          shortName: '',
          regularMarketPrice: null,
          sector: '',
        };
        const next: Record<string, StockStats> = {};
        for (const sym of symbols) {
          next[sym] = batch[sym] ?? { ...empty, shortName: sym };
        }
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
    () =>
      [
        {
          label: 'CMP',
          rank: 'none' as const,
          value: (_s: string) => null as number | null,
          fmt: (s: string) => {
            const p = statsBySymbol[s]?.regularMarketPrice;
            return p != null ? fmtInr(p) : '—';
          },
        },
        {
          label: 'Market Cap',
          rank: 'higher' as const,
          value: (s: string) => statsBySymbol[s]?.marketCap ?? null,
          fmt: (s: string) => fmtMarketCap(statsBySymbol[s]?.marketCap ?? null),
        },
        {
          label: 'P/E',
          rank: 'lower' as const,
          value: (s: string) => statsBySymbol[s]?.pe ?? null,
          fmt: (s: string) => fmtRatio(statsBySymbol[s]?.pe ?? null),
        },
        {
          label: 'Forward P/E',
          rank: 'lower' as const,
          value: (s: string) => statsBySymbol[s]?.forwardPE ?? null,
          fmt: (s: string) => fmtRatio(statsBySymbol[s]?.forwardPE ?? null),
        },
        {
          label: 'P/B',
          rank: 'lower' as const,
          value: (s: string) => statsBySymbol[s]?.pb ?? null,
          fmt: (s: string) => fmtRatio(statsBySymbol[s]?.pb ?? null),
        },
        {
          label: 'Beta',
          rank: 'none' as const,
          value: (_s: string) => null as number | null,
          fmt: (s: string) => fmtRatio(statsBySymbol[s]?.beta ?? null),
        },
        {
          label: '52W Change',
          rank: 'higher' as const,
          value: (s: string) => statsBySymbol[s]?.fiftyTwoWeekChange ?? null,
          fmt: (s: string) => fmtPct(statsBySymbol[s]?.fiftyTwoWeekChange ?? null),
        },
        {
          label: 'Sector',
          rank: 'none' as const,
          value: (_s: string) => null as number | null,
          fmt: (s: string) => statsBySymbol[s]?.sector || '—',
        },
      ] as const,
    [statsBySymbol],
  );

  const activeBenchmark = useMemo(
    () => BENCHMARK_OPTIONS.find((o) => o.mode === benchmarkMode && o.mode !== 'off'),
    [benchmarkMode],
  );

  const showNormalizedChart =
    symbols.length >= 2 || (symbols.length >= 1 && activeBenchmark != null);

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

  const tooltipStyles = useMemo(
    () =>
      isDark
        ? {
            contentStyle: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgb(55, 65, 81)',
              borderRadius: '8px',
            },
            labelStyle: { color: '#e5e7eb' },
            itemStyle: { color: '#e5e7eb' },
          }
        : {
            contentStyle: {
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgb(229, 231, 235)',
              borderRadius: '8px',
            },
            labelStyle: { color: '#111827' },
            itemStyle: { color: '#111827' },
          },
    [isDark],
  );

  const axisStroke = isDark ? '#9ca3af' : '#6b7280';
  const gridStroke = isDark ? '#374151' : '#e5e7eb';
  const legendColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <PageLayout
      className="max-w-6xl pb-10"
      title={PAGE_COPY.compare.title}
      description={PAGE_COPY.compare.description}
    >
      <div className="w-full flex flex-col gap-6">
      {symbols.length === 0 && (
        <EmptyState
          title={PAGE_COPY.compare.emptyTitle}
          description={PAGE_COPY.compare.emptyDescription}
        />
      )}

      <div ref={wrapperRef} className="relative w-full">
        <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
          {symbols.map((sym, i) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-sm font-semibold bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
            >
              <span style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{sym}</span>
              <button
                type="button"
                onClick={() => removeSymbol(sym)}
                className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
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
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={symbols.length >= 4 || !input.trim()}
            className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </form>

        {showDropdown && symbols.length < 4 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg max-h-56 overflow-y-auto">
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic">No matches</li>
            ) : (
              suggestions.map((s, idx) => (
                <li
                  key={s.symbol}
                  className={`px-4 py-2.5 cursor-pointer flex justify-between items-center text-sm
                    ${idx === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  onMouseDown={() => {
                    if (!symbols.includes(s.symbol)) addSymbol(s.symbol);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{s.symbol}</span>
                    <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">{s.shortname}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{s.exchange === 'NSI' ? 'NSE' : 'BSE'}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {showNormalizedChart && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Normalized % change</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Index</span>
                <div className="flex gap-0.5 bg-white dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                  {BENCHMARK_OPTIONS.map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setBenchmarkMode(opt.mode)}
                      className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                        benchmarkMode === opt.mode
                          ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-300'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {opt.mode === 'off' ? 'Off' : opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-transparent">
                {RANGE_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRange(key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      range === key
                        ? 'bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[240px] sm:h-[320px] w-full">
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
                    formatter={(value: unknown, name: unknown) => {
                      const pct = `${Number(value).toFixed(2)}%`;
                      const key = String(name);
                      if (key === 'NIFTY_50') return [pct, 'Nifty 50'];
                      if (key === 'SENSEX_IDX') return [pct, 'Sensex'];
                      return [pct, key];
                    }}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend wrapperStyle={{ color: legendColor }} />
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
                  {activeBenchmark && (
                    <Line
                      type="monotone"
                      dataKey={activeBenchmark.dataKey}
                      stroke={BENCHMARK_STRIKE}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      name={activeBenchmark.label}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {symbols.length >= 2 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100/90 dark:bg-gray-800/80">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Comparison</h3>
            {statsLoading && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Updating statistics…</p>
            )}
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-100/80 dark:bg-gray-800/50 border-b border-gray-300 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap sticky left-0 z-10 bg-gray-100/95 dark:bg-gray-800/95 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Metric
                  </th>
                  {symbols.map((sym, i) => (
                    <th
                      key={sym}
                      className="text-right px-4 py-3 font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                      style={{ borderBottom: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}
                    >
                      <span className="block text-xs font-normal text-gray-400 dark:text-gray-500">{sym}</span>
                      <span className="font-semibold">{statsBySymbol[sym]?.shortName ?? sym}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => {
                  const highlights = computeRowHighlights(symbols, row.rank, row.value);
                  return (
                    <tr
                      key={row.label}
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        {row.label}
                      </td>
                      {symbols.map((sym) => {
                        const h = highlights[sym];
                        const cellBg =
                          h === 'best'
                            ? 'bg-emerald-100/80 dark:bg-emerald-500/15'
                            : h === 'worst'
                              ? 'bg-rose-100/80 dark:bg-rose-500/15'
                              : '';
                        return (
                          <td
                            key={`${row.label}-${sym}`}
                            className={`px-4 py-2.5 text-right font-mono text-gray-800 dark:text-gray-200 ${cellBg}`}
                          >
                            {row.fmt(sym)}
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
      )}

      {symbols.length === 1 && !activeBenchmark && (
        <p className="body-text py-8 px-6 rounded-xl border border-dashed border-border dark:border-border-dark">
          Add another stock for the comparison table, or turn on an index overlay above to chart vs Nifty / Sensex.
        </p>
      )}
      </div>
    </PageLayout>
  );
}
