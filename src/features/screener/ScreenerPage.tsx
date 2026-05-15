import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  fetchScreenerList,
  runScreener,
  ScreenerResult,
  ScreenerProgress,
  ScreenerStock,
} from '../../utils/screener';

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMcap(cr: number): string {
  if (cr >= 100000) return `${(cr / 100000).toFixed(1)}L Cr`;
  if (cr >= 1000) return `${(cr / 1000).toFixed(1)}K Cr`;
  return `${cr.toFixed(0)} Cr`;
}

function distPct(current: number, target: number): string {
  if (!target || !current) return '—';
  const pct = ((current - target) / target) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

type SortKey = 'name' | 'pattern' | 'buyPrice' | 'trigger' | 'cmp' | 'mcap' | 'sector' | '52wLow' | '52wHigh' | 'distLow' | 'distHigh' | 'ath';
type SortDir = 'asc' | 'desc';

interface Props {
  onViewStock?: (symbol: string) => void;
}

export function ScreenerPage({ onViewStock }: Props) {
  const [autoScan, setAutoScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [stockList, setStockList] = useState<ScreenerStock[]>([]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [progress, setProgress] = useState<ScreenerProgress>({ scanned: 0, total: 0, found: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('cmp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showBuyPrices, setShowBuyPrices] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasAutoScanned = useRef(false);

  const startScan = useCallback(async (stocks?: ScreenerStock[]) => {
    if (scanning) return;
    setError(null);
    setResults([]);
    setProgress({ scanned: 0, total: 0, found: 0 });
    setScanning(true);

    let list = stocks ?? stockList;
    if (list.length === 0) {
      setLoadingList(true);
      try {
        list = await fetchScreenerList();
        setStockList(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock list');
        setScanning(false);
        setLoadingList(false);
        return;
      }
      setLoadingList(false);
    }

    setProgress({ scanned: 0, total: list.length, found: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await runScreener(
        list,
        (p) => setProgress(p),
        (r) => setResults((prev) => [...prev, r]),
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Scan failed');
      }
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }, [scanning, stockList]);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (autoScan && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      startScan();
    }
  }, [autoScan, startScan]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedResults = useMemo(() => {
    const rows = [...results];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.shortName.localeCompare(b.shortName); break;
        case 'pattern': cmp = a.match.patternName.localeCompare(b.match.patternName); break;
        case 'buyPrice': cmp = a.match.buyPrice - b.match.buyPrice; break;
        case 'trigger': cmp = a.match.buyTriggerPrice - b.match.buyTriggerPrice; break;
        case 'cmp': cmp = a.currentPrice - b.currentPrice; break;
        case 'mcap': cmp = a.marketCapCr - b.marketCapCr; break;
        case 'sector': cmp = (a.sector || '').localeCompare(b.sector || ''); break;
        case '52wLow': cmp = a.fiftyTwoWeekLow - b.fiftyTwoWeekLow; break;
        case '52wHigh': cmp = a.fiftyTwoWeekHigh - b.fiftyTwoWeekHigh; break;
        case 'distLow': {
          const dA = a.fiftyTwoWeekLow ? ((a.currentPrice - a.fiftyTwoWeekLow) / a.fiftyTwoWeekLow) : 0;
          const dB = b.fiftyTwoWeekLow ? ((b.currentPrice - b.fiftyTwoWeekLow) / b.fiftyTwoWeekLow) : 0;
          cmp = dA - dB;
          break;
        }
        case 'distHigh': {
          const dA = a.fiftyTwoWeekHigh ? ((a.currentPrice - a.fiftyTwoWeekHigh) / a.fiftyTwoWeekHigh) : 0;
          const dB = b.fiftyTwoWeekHigh ? ((b.currentPrice - b.fiftyTwoWeekHigh) / b.fiftyTwoWeekHigh) : 0;
          cmp = dA - dB;
          break;
        }
        case 'ath': cmp = a.allTimeHigh - b.allTimeHigh; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [results, sortKey, sortDir]);

  const pct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mt-10 space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Live Screener</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Scans NSE stocks (Market Cap &gt; ₹1,000 Cr) for Bullish Harami &amp; Engulfing breakouts today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAutoScan((v) => !v)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                autoScan ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              title={autoScan ? 'Auto-scan enabled' : 'Auto-scan disabled'}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-200 transform transition-transform ${
                  autoScan ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {autoScan ? 'Auto' : 'Manual'}
            </span>

            {scanning ? (
              <button
                onClick={stopScan}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Stop Scan
              </button>
            ) : (
              <button
                onClick={() => startScan()}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                Scan Now
              </button>
            )}
          </div>
        </div>

        {(scanning || progress.total > 0) && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>
                {loadingList
                  ? 'Fetching stock list...'
                  : scanning
                    ? `Scanning ${progress.scanned} / ${progress.total} stocks...`
                    : `Scan complete — ${progress.scanned} stocks scanned`}
              </span>
              <span className="font-semibold text-blue-600">
                {progress.found} pattern{progress.found !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  scanning ? 'bg-blue-500' : 'bg-green-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-800 p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">Error</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}

      {results.length === 0 && !scanning && progress.total > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No patterns found in the current scan.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-end px-4 py-2 border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setShowBuyPrices((v) => !v)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                showBuyPrices
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {showBuyPrices ? 'Hide Buy Prices' : 'Show Buy Prices'}
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <SortHeader label="Stock" k="name" current={sortKey} dir={sortDir} onSort={toggleSort} align="left" />
                  <SortHeader label="Pattern" k="pattern" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="CMP" k="cmp" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  {showBuyPrices && (
                    <>
                      <SortHeader label="Buy Price" k="buyPrice" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Trigger" k="trigger" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    </>
                  )}
                  <SortHeader label="52W Low" k="52wLow" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist Low" k="distLow" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="52W High" k="52wHigh" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist High" k="distHigh" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="ATH" k="ath" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Market Cap" k="mcap" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr
                    key={r.symbol}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => onViewStock?.(r.symbol)}
                  >
                    <td className="p-3 text-left sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{r.shortName}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.symbol}</p>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        r.match.patternName === 'Bullish Harami'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      }`}>
                        {r.match.patternName === 'Bullish Harami' ? 'Harami' : 'Engulfing'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                      {r.currentPrice ? fmt(r.currentPrice) : '—'}
                    </td>
                    {showBuyPrices && (
                      <>
                        <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                          {fmt(r.match.buyPrice)}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                          {fmt(r.match.buyTriggerPrice)}
                        </td>
                      </>
                    )}
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.fiftyTwoWeekLow ? fmt(r.fiftyTwoWeekLow) : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekLow && r.currentPrice > r.fiftyTwoWeekLow ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {distPct(r.currentPrice, r.fiftyTwoWeekLow)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.fiftyTwoWeekHigh ? fmt(r.fiftyTwoWeekHigh) : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekHigh && r.currentPrice >= r.fiftyTwoWeekHigh ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {distPct(r.currentPrice, r.fiftyTwoWeekHigh)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.allTimeHigh ? fmt(r.allTimeHigh) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-500 dark:text-gray-400 text-xs">
                      {r.marketCapCr ? formatMcap(r.marketCapCr) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length === 0 && !scanning && progress.total === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Click <strong>Scan Now</strong> or enable <strong>Auto</strong> to start scanning for patterns.
          </p>
        </div>
      )}
    </div>
  );
}

function SortHeader({ label, k, current, dir, onSort, align = 'right' }: {
  label: string; k: SortKey; current: SortKey; dir: SortDir;
  onSort: (key: SortKey) => void; align?: 'left' | 'right';
}) {
  const isActive = current === k;
  return (
    <th
      className={`p-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap
        ${align === 'left' ? 'text-left sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]' : 'text-right'}
        ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'}`}
      onClick={() => onSort(k)}
    >
      {label}
      {isActive && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}
