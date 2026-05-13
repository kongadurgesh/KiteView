import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchScreenerList } from '../utils/screener';
import { fetchBatchQuotesFull, QuoteFull } from '../utils/fetchStockData';

interface Props {
  onViewStock?: (symbol: string) => void;
}

function changeColor(pct: number): string {
  const clamped = Math.max(-3, Math.min(3, pct));
  if (clamped >= 0) {
    const t = clamped / 3;
    const r = Math.round(75 - 75 * t);
    const g = Math.round(85 + 100 * t);
    const b = Math.round(75 - 75 * t);
    return `rgb(${r},${g},${b})`;
  }
  const t = -clamped / 3;
  const r = Math.round(75 + 120 * t);
  const g = Math.round(85 - 55 * t);
  const b = Math.round(75 - 45 * t);
  return `rgb(${r},${g},${b})`;
}

interface TreemapRect {
  quote: QuoteFull;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: QuoteFull[], width: number, height: number): TreemapRect[] {
  const rects: TreemapRect[] = [];
  let x = 0, y = 0, remainW = width, remainH = height;

  const sorted = [...items].sort((a, b) => b.marketCap - a.marketCap);
  let i = 0;

  while (i < sorted.length) {
    const isHorizontal = remainW >= remainH;
    const side = isHorizontal ? remainH : remainW;
    const remainTotal = sorted.slice(i).reduce((s, q) => s + Math.max(q.marketCap, 1), 0);

    let row: QuoteFull[] = [];
    let rowTotal = 0;
    let bestAspect = Infinity;

    for (let j = i; j < sorted.length; j++) {
      const val = Math.max(sorted[j].marketCap, 1);
      const newTotal = rowTotal + val;
      const newCount = row.length + 1;
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

      if (worstAspect <= bestAspect || newCount === 1) {
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

export function HeatmapPage({ onViewStock }: Props) {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<QuoteFull[]>([]);
  const [sectorFilter, setSectorFilter] = useState('All');
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stocks = await fetchScreenerList();
      const allQuotes: QuoteFull[] = [];
      for (let i = 0; i < stocks.length; i += 50) {
        const batch = stocks.slice(i, i + 50).map((s) => s.symbol);
        const results = await fetchBatchQuotesFull(batch);
        allQuotes.push(...results);
      }
      setQuotes(allQuotes.filter((q) => q.regularMarketPrice > 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sectors = useMemo(() => {
    const s = new Set(quotes.map((q) => q.sector).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [quotes]);

  const filtered = useMemo(() => {
    if (sectorFilter === 'All') return quotes;
    return quotes.filter((q) => q.sector === sectorFilter);
  }, [quotes, sectorFilter]);

  const containerWidth = 1200;
  const containerHeight = 600;
  const rects = useMemo(() => squarify(filtered, containerWidth, containerHeight), [filtered]);

  const gainers = filtered.filter((q) => q.regularMarketChangePercent > 0).length;
  const losers = filtered.filter((q) => q.regularMarketChangePercent < 0).length;

  return (
    <div className="w-full max-w-7xl mt-10 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Market Heatmap</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              NSE stocks by market cap, colored by daily change
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{filtered.length} stocks</span>
            <span className="text-green-600 dark:text-green-400">{gainers} gainers</span>
            <span className="text-red-600 dark:text-red-400">{losers} losers</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: changeColor(-3) }} />
              -3%
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: changeColor(0) }} />
              0%
              <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: changeColor(3) }} />
              +3%
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-20 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Loading market data...</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-2">
          <div className="relative w-full" style={{ paddingBottom: `${(containerHeight / containerWidth) * 100}%` }}>
            <div className="absolute inset-0">
              {rects.map((r) => {
                const pctX = (r.x / containerWidth) * 100;
                const pctY = (r.y / containerHeight) * 100;
                const pctW = (r.w / containerWidth) * 100;
                const pctH = (r.h / containerHeight) * 100;
                const area = pctW * pctH;
                const fontSize = area > 4 ? 12 : area > 1 ? 10 : 8;
                const showName = area > 0.3;

                return (
                  <div
                    key={r.quote.symbol}
                    className="absolute overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-white transition-opacity hover:opacity-80"
                    style={{
                      left: `${pctX}%`,
                      top: `${pctY}%`,
                      width: `${pctW}%`,
                      height: `${pctH}%`,
                      backgroundColor: changeColor(r.quote.regularMarketChangePercent),
                      fontSize: `${fontSize}px`,
                    }}
                    onClick={() => onViewStock?.(r.quote.symbol)}
                    title={`${r.quote.shortName} (${r.quote.symbol})\n${r.quote.regularMarketChangePercent >= 0 ? '+' : ''}${r.quote.regularMarketChangePercent.toFixed(2)}%\n₹${r.quote.regularMarketPrice.toLocaleString('en-IN')}`}
                  >
                    {showName && (
                      <>
                        <span className="font-bold leading-tight truncate max-w-full px-0.5">
                          {r.quote.symbol.replace('.NS', '')}
                        </span>
                        <span className="font-medium leading-tight">
                          {r.quote.regularMarketChangePercent >= 0 ? '+' : ''}
                          {r.quote.regularMarketChangePercent.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No data available. Click Refresh to load.</p>
        </div>
      )}
    </div>
  );
}
