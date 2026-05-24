import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { SectionHeader } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import { fmtDistPct, fmtMarketCapCr, fmtNumber } from '../../lib/format';
import {
  defaultHistoricalRange,
  fetchScreenerList,
  runScreener,
  ScreenerResult,
  ScreenerProgress,
  ScreenerStock,
} from '../../utils/screener';
import { AddToWatchlistButton } from '../watchlist/components/AddToWatchlistButton';

type ScanMode = 'today' | 'range';
type SortKey =
  | 'name'
  | 'patternDate'
  | 'signal'
  | 'distBuy'
  | 'buyPrice'
  | 'cmp'
  | 'mcap'
  | 'sector'
  | '52wLow'
  | '52wHigh'
  | 'distLow'
  | 'distHigh'
  | 'ath'
  | 'swot';
type SortDir = 'asc' | 'desc';

function SignalBadge({ signal }: { signal: 'BUY' | 'WAIT' }) {
  const isBuy = signal === 'BUY';
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
        isBuy
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
      }`}
    >
      {signal}
    </span>
  );
}

export function ScreenerPage() {
  const { viewStock } = useAppNavigation();
  const defaultRange = useMemo(() => defaultHistoricalRange(), []);
  const [scanMode, setScanMode] = useState<ScanMode>('today');
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [scanning, setScanning] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [stockList, setStockList] = useState<ScreenerStock[]>([]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [progress, setProgress] = useState<ScreenerProgress>({ scanned: 0, total: 0, found: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('cmp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async (stocks?: ScreenerStock[]) => {
    if (scanning) return;
    if (scanMode === 'range' && (!fromDate || !toDate)) {
      setError('Select both From and To dates for a date range scan.');
      return;
    }
    if (scanMode === 'range' && fromDate > toDate) {
      setError('From date must be on or before To date.');
      return;
    }
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

    const options =
      scanMode === 'range'
        ? { mode: 'historical' as const, fromDate, toDate }
        : { mode: 'today' as const };

    try {
      await runScreener(
        list,
        (p) => setProgress(p),
        (r) => setResults((prev) => [...prev, r]),
        controller.signal,
        options,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Scan failed');
      }
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }, [scanning, stockList, scanMode, fromDate, toDate]);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    setResults([]);
    setProgress({ scanned: 0, total: 0, found: 0 });
    setError(null);
  }, [scanMode, fromDate, toDate]);

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
        case 'patternDate': cmp = a.match.candle3.date.localeCompare(b.match.candle3.date); break;
        case 'signal': cmp = a.signal.localeCompare(b.signal); break;
        case 'distBuy': {
          const dA = a.match.buyPrice ? ((a.currentPrice - a.match.buyPrice) / a.match.buyPrice) : 0;
          const dB = b.match.buyPrice ? ((b.currentPrice - b.match.buyPrice) / b.match.buyPrice) : 0;
          cmp = dA - dB;
          break;
        }
        case 'buyPrice': cmp = a.match.buyPrice - b.match.buyPrice; break;
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
        case 'swot': {
          const score = (r: ScreenerResult) =>
            r.swotStrengths != null && r.swotWeaknesses != null
              ? r.swotStrengths - r.swotWeaknesses
              : -Infinity;
          cmp = score(a) - score(b);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [results, sortKey, sortDir]);

  const pct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  return (
    <PageLayout className="w-full max-w-none mt-6" title={PAGE_COPY.screener.title} description={PAGE_COPY.screener.description}>
      <div className="w-full space-y-6">
      <div className="card p-6">
        <SectionHeader title="Scan controls" />

        <div className="flex flex-wrap items-center gap-3 w-full pt-1">
          <span className="text-xs font-medium text-ink-muted dark:text-ink-dark-muted">Scan</span>
          <div className="flex gap-0.5 bg-surface-muted dark:bg-surface-dark-muted rounded-lg p-0.5 border border-border dark:border-border-dark">
            {(['today', 'range'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (scanMode !== mode) setScanMode(mode);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  scanMode === mode
                    ? 'bg-surface dark:bg-surface-dark text-accent shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary dark:hover:text-ink-dark-primary'
                }`}
              >
                {mode === 'today' ? 'Today' : 'Date range'}
              </button>
            ))}
          </div>
          {scanMode === 'range' && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">
                From
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="input-field !w-auto !py-1.5 !px-2 text-xs"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">
                To
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setToDate(e.target.value)}
                  className="input-field !w-auto !py-1.5 !px-2 text-xs"
                />
              </label>
            </>
          )}

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
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No patterns found{scanMode === 'range' ? ' in the selected date range' : ' for today'}.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1280px]">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <SortHeader label="Stock" k="name" current={sortKey} dir={sortDir} onSort={toggleSort} align="left" />
                  <SortHeader label="Signal" k="signal" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Pattern date" k="patternDate" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="CMP" k="cmp" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="% vs Buy" k="distBuy" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Buy Price" k="buyPrice" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="52W Low" k="52wLow" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist Low" k="distLow" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="52W High" k="52wHigh" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist High" k="distHigh" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="ATH" k="ath" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Market Cap" k="mcap" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="SWOT" k="swot" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="p-3 text-right font-medium text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    Watchlist
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr
                    key={r.symbol}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => viewStock(r.symbol)}
                  >
                    <td className="p-3 text-left sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{r.shortName}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.symbol}</p>
                    </td>
                    <td className="p-3 text-right">
                      <SignalBadge signal={r.signal} />
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                      {r.match.candle3.date}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                      {r.currentPrice ? fmtNumber(r.currentPrice) : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      !r.match.buyPrice || !r.currentPrice
                        ? 'text-gray-500 dark:text-gray-400'
                        : r.currentPrice >= r.match.buyPrice
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.match.buyPrice)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                      {fmtNumber(r.match.buyPrice)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.fiftyTwoWeekLow ? fmtNumber(r.fiftyTwoWeekLow) : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekLow && r.currentPrice > r.fiftyTwoWeekLow ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekLow)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.fiftyTwoWeekHigh ? fmtNumber(r.fiftyTwoWeekHigh) : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekHigh && r.currentPrice >= r.fiftyTwoWeekHigh ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekHigh)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300 text-xs">
                      {r.allTimeHigh ? fmtNumber(r.allTimeHigh) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-500 dark:text-gray-400 text-xs">
                      {r.marketCapCr ? fmtMarketCapCr(r.marketCapCr) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      {r.swotStrengths != null && r.swotWeaknesses != null ? (
                        <span className={r.swotStrengths >= r.swotWeaknesses ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {r.swotStrengths}/{r.swotWeaknesses}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <AddToWatchlistButton
                        symbol={r.symbol}
                        shortName={r.shortName}
                        thesis={{
                          entryBuyPrice: r.match.buyPrice,
                          patternDate: r.match.candle3.date,
                        }}
                      />
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
            Click <strong>Scan Now</strong> to start scanning for patterns.
          </p>
        </div>
      )}
      </div>
    </PageLayout>
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
