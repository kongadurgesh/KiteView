import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMatch } from 'react-router-dom';
import { useAppNavigation } from '../../app/navigation';
import { fetchScreenerList, ScreenerStock } from '../../utils/screener';
import { fetchHeatmapBatch, HeatmapTimeframe, QuoteFull } from '../../utils/fetchStockData';

interface IndexOption {
  id: string;
  label: string;
  start: number;
  end: number;
}

const INDICES: IndexOption[] = [
  { id: 'nifty50', label: 'Nifty 50', start: 0, end: 50 },
  { id: 'sensex30', label: 'Sensex 30', start: 0, end: 30 },
  { id: 'niftynext50', label: 'Nifty Next 50', start: 50, end: 100 },
  { id: 'nifty100', label: 'Nifty 100', start: 0, end: 100 },
  { id: 'niftymidcap50', label: 'Nifty Midcap 50', start: 100, end: 150 },
  { id: 'niftymidcap100', label: 'Nifty Midcap 100', start: 100, end: 200 },
  { id: 'nifty200', label: 'Nifty 200', start: 0, end: 200 },
  { id: 'nifty500', label: 'Nifty 500', start: 0, end: 500 },
  { id: 'niftysmallcap100', label: 'Nifty Smallcap 100', start: 200, end: 300 },
  { id: 'all', label: 'All Stocks', start: 0, end: Infinity },
];

const TIMEFRAME_OPTIONS: { key: HeatmapTimeframe; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '1y', label: '1Y' },
];

const AUTO_REFRESH_MS = 120_000;

function heatColor(pct: number): string {
  const c = Math.max(-4, Math.min(4, pct));
  const t = Math.min(Math.abs(c) / 3, 1);
  const nr = 198, ng = 195, nb = 195;

  if (c > 0) {
    return `rgb(${Math.round(nr + (0 - nr) * t)},${Math.round(ng + (144 - ng) * t)},${Math.round(nb + (74 - nb) * t)})`;
  }
  if (c < 0) {
    return `rgb(${Math.round(nr + (204 - nr) * t)},${Math.round(ng + (50 - ng) * t)},${Math.round(nb + (56 - nb) * t)})`;
  }
  return `rgb(${nr},${ng},${nb})`;
}

function fmtPrice(n: number): string {
  if (n >= 10000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

interface TreemapRect {
  quote: QuoteFull;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: QuoteFull[], width: number, height: number): TreemapRect[] {
  if (items.length === 0) return [];
  const rects: TreemapRect[] = [];
  let x = 0, y = 0, remainW = width, remainH = height;
  const sorted = [...items].sort((a, b) => b.marketCap - a.marketCap);
  let i = 0;

  while (i < sorted.length && remainW > 0 && remainH > 0) {
    const isHorizontal = remainW >= remainH;
    const side = isHorizontal ? remainH : remainW;
    const remainTotal = sorted.slice(i).reduce((s, q) => s + Math.max(q.marketCap, 1), 0);

    const row: QuoteFull[] = [];
    let rowTotal = 0;
    let bestAspect = Infinity;

    for (let j = i; j < sorted.length; j++) {
      const val = Math.max(sorted[j].marketCap, 1);
      const newTotal = rowTotal + val;
      const rowFraction = newTotal / remainTotal;
      const rowLen = rowFraction * (isHorizontal ? remainW : remainH);

      let worstAspect = 0;
      let tempTotal = 0;
      for (let k = i; k <= j; k++) {
        tempTotal += Math.max(sorted[k].marketCap, 1);
        const cellLen = (tempTotal / newTotal) * side - ((tempTotal - Math.max(sorted[k].marketCap, 1)) / newTotal) * side;
        const aspect = rowLen > 0 && cellLen > 0 ? Math.max(rowLen / cellLen, cellLen / rowLen) : Infinity;
        if (aspect > worstAspect) worstAspect = aspect;
      }

      if (worstAspect <= bestAspect || row.length === 0) {
        bestAspect = worstAspect;
        row.push(sorted[j]);
        rowTotal = newTotal;
      } else {
        break;
      }
    }

    const rowFraction = rowTotal / remainTotal;
    const rowLen = rowFraction * (isHorizontal ? remainW : remainH);
    let offset = 0;

    for (const q of row) {
      const val = Math.max(q.marketCap, 1);
      const cellFraction = val / rowTotal;
      const cellLen = cellFraction * side;

      if (isHorizontal) {
        rects.push({ quote: q, x, y: y + offset, w: rowLen, h: cellLen });
      } else {
        rects.push({ quote: q, x: x + offset, y, w: cellLen, h: rowLen });
      }
      offset += cellLen;
    }

    if (isHorizontal) {
      x += rowLen;
      remainW -= rowLen;
    } else {
      y += rowLen;
      remainH -= rowLen;
    }

    i += row.length;
  }

  return rects;
}

export function HeatmapPage() {
  const { viewStock } = useAppNavigation();
  const isActive = useMatch({ path: '/heatmap', end: true }) != null;
  const [allStocks, setAllStocks] = useState<ScreenerStock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState('nifty50');
  const [timeframe, setTimeframe] = useState<HeatmapTimeframe>('1d');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [displayQuotes, setDisplayQuotes] = useState<QuoteFull[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cache = useRef(new Map<string, QuoteFull>());
  const runId = useRef(0);

  const currentStocks = useMemo(() => {
    if (allStocks.length === 0) return [];
    const idx = INDICES.find((i) => i.id === selectedIndex) ?? INDICES[0];
    return allStocks.slice(idx.start, Math.min(idx.end, allStocks.length));
  }, [allStocks, selectedIndex]);

  const cacheKey = useCallback((symbol: string, tf: HeatmapTimeframe) => `${symbol}:${tf}`, []);

  const loadQuotes = useCallback(async (stocks: ScreenerStock[], tf: HeatmapTimeframe, force: boolean) => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);

    const needed = force
      ? stocks
      : stocks.filter((s) => !cache.current.has(cacheKey(s.symbol, tf)));

    if (needed.length === 0) {
      if (runId.current === id) {
        setDisplayQuotes(
          stocks.map((s) => cache.current.get(cacheKey(s.symbol, tf))!).filter(Boolean),
        );
        setLoading(false);
      }
      return;
    }

    setProgress({ loaded: 0, total: needed.length });

    for (let i = 0; i < needed.length; i += 50) {
      if (runId.current !== id) return;
      const batch = needed.slice(i, i + 50).map((s) => s.symbol);
      try {
        const results = await fetchHeatmapBatch(batch, tf);
        for (const q of results) {
          if (q.regularMarketPrice > 0) cache.current.set(cacheKey(q.symbol, tf), q);
        }
      } catch { /* continue */ }
      if (runId.current === id) {
        setProgress({ loaded: Math.min(i + 50, needed.length), total: needed.length });
      }
    }

    if (runId.current === id) {
      setDisplayQuotes(
        stocks.map((s) => cache.current.get(cacheKey(s.symbol, tf))!).filter(Boolean),
      );
      setLastUpdated(new Date());
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    (async () => {
      try {
        const stocks = await fetchScreenerList();
        setAllStocks(stocks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stock list');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (currentStocks.length === 0) return;
    loadQuotes(currentStocks, timeframe, false);
  }, [currentStocks, timeframe, loadQuotes]);

  useEffect(() => {
    if (!isActive || currentStocks.length === 0) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      loadQuotes(currentStocks, timeframe, true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [isActive, currentStocks, timeframe, loadQuotes]);

  const handleRefresh = () => {
    if (currentStocks.length === 0) return;
    loadQuotes(currentStocks, timeframe, true);
  };

  const timeframeLabel = TIMEFRAME_OPTIONS.find((t) => t.key === timeframe)?.label ?? '1D';

  const CW = 1600;
  const CH = useMemo(() => {
    const n = displayQuotes.length;
    if (n <= 30) return 750;
    if (n <= 50) return 850;
    if (n <= 100) return 800;
    return 700;
  }, [displayQuotes.length]);

  const rects = useMemo(() => squarify(displayQuotes, CW, CH), [displayQuotes, CH]);

  const gainers = displayQuotes.filter((q) => q.changePercent > 0).length;
  const losers = displayQuotes.filter((q) => q.changePercent < 0).length;
  const unchanged = displayQuotes.length - gainers - losers;

  const progressPct = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;

  return (
    <div className="w-full max-w-7xl mt-6 space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Market Heatmap</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Sized by market cap, colored by {timeframeLabel} change
                {lastUpdated && (
                  <span className="ml-2 text-gray-400 dark:text-gray-500">
                    &middot; Last updated {fmtTime(lastUpdated)}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Index</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {INDICES.map((idx) => (
                  <option key={idx.id} value={idx.id}>{idx.label}</option>
                ))}
              </select>
            </div>

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Period</span>
              <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                {TIMEFRAME_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeframe(key)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      timeframe === key
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-5 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />

            {!loading && displayQuotes.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="text-gray-500 dark:text-gray-400">{displayQuotes.length} stocks</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                  {gainers}
                </span>
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  {losers}
                </span>
                {unchanged > 0 && (
                  <span className="text-gray-400 dark:text-gray-500">{unchanged} flat</span>
                )}
              </div>
            )}

            <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] font-medium text-gray-400 dark:text-gray-500">
              <span>-3%</span>
              <div
                className="h-2.5 w-28 rounded-full"
                style={{
                  background: `linear-gradient(to right, ${heatColor(-3)}, ${heatColor(-1.5)}, ${heatColor(0)}, ${heatColor(1.5)}, ${heatColor(3)})`,
                }}
              />
              <span>+3%</span>
            </div>
          </div>

          {loading && progress.total > 0 && (
            <div className="w-full">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Loading {progress.loaded} / {progress.total} stocks...
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && displayQuotes.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Fetching market data...</p>
        </div>
      )}

      {displayQuotes.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden p-1.5">
          <div className="relative w-full" style={{ paddingBottom: `${(CH / CW) * 100}%` }}>
            <div className="absolute inset-0">
              {rects.map((r) => {
                const pctX = (r.x / CW) * 100;
                const pctY = (r.y / CH) * 100;
                const pctW = (r.w / CW) * 100;
                const pctH = (r.h / CH) * 100;
                const sizeFactor = Math.sqrt(pctW * pctH);
                const showSymbol = sizeFactor > 1.2;
                const showChange = sizeFactor > 1.8;
                const showPrice = sizeFactor > 5;
                const fontSize = sizeFactor > 7 ? 15 : sizeFactor > 5 ? 13 : sizeFactor > 3 ? 11 : sizeFactor > 2 ? 9 : 7;
                const changePct = r.quote.changePercent;
                const intensity = Math.min(Math.abs(changePct) / 1.5, 1);
                const useDarkText = intensity < 0.4;
                const textColor = useDarkText ? '#1f2937' : '#ffffff';
                const shadowColor = useDarkText ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.5)';

                return (
                  <div
                    key={r.quote.symbol}
                    className="absolute overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all duration-150 hover:brightness-110 hover:z-10"
                    style={{
                      left: `calc(${pctX}% + 1px)`,
                      top: `calc(${pctY}% + 1px)`,
                      width: `calc(${pctW}% - 2px)`,
                      height: `calc(${pctH}% - 2px)`,
                      backgroundColor: heatColor(changePct),
                      borderRadius: '3px',
                      fontSize: `${fontSize}px`,
                      color: textColor,
                      textShadow: `0 1px 2px ${shadowColor}`,
                    }}
                    onClick={() => viewStock(r.quote.symbol)}
                    title={`${r.quote.shortName}\n${r.quote.symbol}\n${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%\n₹${r.quote.regularMarketPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                  >
                    {showSymbol && (
                      <span className="font-bold leading-tight truncate max-w-full px-1">
                        {r.quote.symbol.replace('.NS', '')}
                      </span>
                    )}
                    {showChange && (
                      <span className="font-semibold leading-tight opacity-90" style={{ fontSize: `${Math.max(fontSize - 2, 7)}px` }}>
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    )}
                    {showPrice && (
                      <span className="leading-tight mt-0.5 opacity-70" style={{ fontSize: `${Math.max(fontSize - 3, 7)}px` }}>
                        {fmtPrice(r.quote.regularMarketPrice)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && displayQuotes.length === 0 && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No data available. Click Refresh to load.</p>
        </div>
      )}
    </div>
  );
}
