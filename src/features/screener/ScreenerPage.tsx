import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { SectionHeader } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import { fmtDistPct, fmtMarketCapCr, fmtNumber } from '../../lib/format';
import {
  defaultHistoricalRange,
  fetchScreenerList,
  runScreener,
  ScreenerFilters,
  ScreenerPatternName,
  ScreenerResult,
  ScreenerProgress,
  ScreenerStock,
} from '../../utils/screener';
import { HEATMAP_INDICES, heatmapIndicesByGroup } from '../../data/heatmapIndices';
import { fetchIndexConstituents } from '../../services/indexConstituents';
import { AddToWatchlistButton } from '../watchlist/components/AddToWatchlistButton';
import { TableSerialCell, TableSerialHeader } from '../../components/ui';

type ScanMode = 'today' | 'range';
type SortKey =
  | 'name'
  | 'patternDate'
  | 'signal'
  | 'distBuy'
  | 'buyPrice'
  | 'cmp'
  | 'mcap'
  | 'distLow'
  | 'distHigh'
  | 'ath'
  | 'swot';
type SortDir = 'asc' | 'desc';

const PATTERN_OPTIONS: ScreenerPatternName[] = ['Bullish Harami', 'Bullish Engulfing'];

const INDEX_OPTIONS = heatmapIndicesByGroup('indian').filter((opt) =>
  HEATMAP_INDICES.some((item) => item.id === opt.id) && opt.id !== 'all',
);

type MultiSelectOption = {
  value: string;
  label: string;
};

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  emptyText = 'All',
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(Math.max(rect.width, 176), window.innerWidth - 16);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - menuWidth - 8));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 16);
    setMenuStyle({ position: 'fixed', left, top, width: menuWidth, zIndex: 60 });
  }, [open]);

  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  const summary =
    selectedLabels.length === 0
      ? emptyText
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-[8.5rem] w-full max-w-[11rem] shrink-0">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">{label}</p>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group relative w-full rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-left text-xs text-ink-primary dark:text-ink-dark-primary hover:border-accent/60 hover:shadow-sm transition-all"
      >
        <span className="truncate block pr-5 leading-4">{summary}</span>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted transition-transform duration-150 group-data-[open=true]:rotate-180">▾</span>
      </button>
      {open && createPortal(
        <div ref={menuRef} style={menuStyle} className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xl ring-1 ring-black/5">
          <div className="max-h-64 overflow-auto p-2">
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-ink-primary dark:text-ink-dark-primary hover:bg-surface-muted dark:hover:bg-surface-dark-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                    className="h-3.5 w-3.5 rounded border-border dark:border-border-dark"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function RangeDropdown({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  widthClassName = 'w-full max-w-[10rem]',
  sliderMin = 0,
  sliderMax = 100000,
  sliderStep = 1,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  widthClassName?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - menuWidth - 8));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 16);
    setMenuStyle({ position: 'fixed', left, top, width: menuWidth, zIndex: 60 });
  }, [open]);

  const summary = min || max ? `${min || '0'} to ${max || '0'}` : 'All';
  const parseOrFallback = (value: string, fallback: number) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
  const formatSliderValue = (value: number) =>
    Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  const sliderSpan = Math.max(1, sliderMax - sliderMin);
  const toPct = (value: number) => ((value - sliderMin) / sliderSpan) * 100;

  const minValue = clamp(parseOrFallback(min, sliderMin), sliderMin, sliderMax);
  const maxValue = clamp(parseOrFallback(max, sliderMax), sliderMin, sliderMax);
  const effectiveMin = Math.min(minValue, maxValue);
  const effectiveMax = Math.max(maxValue, minValue);

  return (
    <div ref={rootRef} className={`relative min-w-[8.5rem] shrink-0 ${widthClassName}`}>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">{label}</p>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group relative w-full rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-left text-xs text-ink-primary dark:text-ink-dark-primary hover:border-accent/60 hover:shadow-sm transition-all"
      >
        <span className="truncate block pr-5 leading-4">{summary}</span>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted">▾</span>
      </button>
      {open && createPortal(
        <div ref={menuRef} style={menuStyle} className="rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-xl ring-1 ring-black/5 p-3">
          <div className="mb-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
              Range Scroll
            </p>
            <div className="relative h-7">
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border dark:bg-border-dark" />
              <div
                className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
                style={{
                  left: `${toPct(effectiveMin)}%`,
                  width: `${Math.max(0, toPct(effectiveMax) - toPct(effectiveMin))}%`,
                }}
              />
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={effectiveMin}
                onChange={(event) => {
                  const nextMin = Math.min(Number(event.target.value), effectiveMax);
                  onMinChange(formatSliderValue(nextMin));
                }}
                className="range-dual-input range-dual-input-min"
              />
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={effectiveMax}
                onChange={(event) => {
                  const nextMax = Math.max(Number(event.target.value), effectiveMin);
                  onMaxChange(formatSliderValue(nextMax));
                }}
                className="range-dual-input range-dual-input-max"
              />
            </div>
            <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
              Range: {sliderMin.toLocaleString()} to {sliderMax.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
              <span className="mb-1 block">Min</span>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={min}
                onChange={(event) => onMinChange(event.target.value)}
                className="input-field !py-2 !px-3 text-xs"
                placeholder={minPlaceholder}
              />
            </label>
            <label className="text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">
              <span className="mb-1 block">Max</span>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={max}
                onChange={(event) => onMaxChange(event.target.value)}
                className="input-field !py-2 !px-3 text-xs"
                placeholder={maxPlaceholder}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onMinChange('');
                onMaxChange('');
              }}
              className="btn-ghost !px-2.5 !py-1.5 text-[11px]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-primary !px-3 !py-1.5 text-[11px]"
            >
              Done
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

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

function parseFilterNumber(value: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
}

export function ScreenerPage() {
  const { viewStock } = useAppNavigation();
  const defaultRange = useMemo(() => defaultHistoricalRange(), []);
  const [scanMode, setScanMode] = useState<ScanMode>('today');
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [selectedIndexIds, setSelectedIndexIds] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<ScreenerPatternName[]>([]);
  const [marketCapMin, setMarketCapMin] = useState('');
  const [marketCapMax, setMarketCapMax] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingIndexUniverse, setLoadingIndexUniverse] = useState(false);
  const [stockList, setStockList] = useState<ScreenerStock[]>([]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [progress, setProgress] = useState<ScreenerProgress>({ scanned: 0, total: 0, found: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('cmp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const abortRef = useRef<AbortController | null>(null);

  const resolveUniverse = useCallback(async (baseStocks: ScreenerStock[]): Promise<ScreenerStock[]> => {
    if (selectedIndexIds.length === 0) {
      return baseStocks;
    }

    setLoadingIndexUniverse(true);
    try {
      const responses = await Promise.all(selectedIndexIds.map((indexId) => fetchIndexConstituents(indexId)));
      const bySymbol = new Map(baseStocks.map((stock) => [stock.symbol, stock]));
      const fromIndices = new Map<string, ScreenerStock>();

      for (const response of responses) {
        for (const stock of response.stocks) {
          const merged = bySymbol.get(stock.symbol) ?? stock;
          fromIndices.set(stock.symbol, merged);
        }
      }

      return Array.from(fromIndices.values());
    } finally {
      setLoadingIndexUniverse(false);
    }
  }, [selectedIndexIds]);

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

    let scopedList = list;
    try {
      scopedList = await resolveUniverse(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve index constituents');
      setScanning(false);
      return;
    }

    if (scopedList.length === 0) {
      setError('No stocks available for selected index filters.');
      setScanning(false);
      return;
    }

    setProgress({ scanned: 0, total: scopedList.length, found: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    const parsedMarketCapMin = parseFilterNumber(marketCapMin);
    const parsedMarketCapMax = parseFilterNumber(marketCapMax);
    const parsedPriceMin = parseFilterNumber(priceMin);
    const parsedPriceMax = parseFilterNumber(priceMax);

    if (
      parsedPriceMin != null &&
      parsedPriceMax != null &&
      parsedPriceMin > parsedPriceMax
    ) {
      setError('Price min must be less than or equal to max.');
      setScanning(false);
      return;
    }

    if (
      parsedMarketCapMin != null &&
      parsedMarketCapMax != null &&
      parsedMarketCapMin > parsedMarketCapMax
    ) {
      setError('Market cap min must be less than or equal to max.');
      setScanning(false);
      return;
    }

    const filters: ScreenerFilters = {};

    if (selectedIndexIds.length > 0) {
      filters.indexIds = selectedIndexIds;
    }

    if (selectedPatterns.length > 0) {
      filters.patterns = selectedPatterns;
    }
    if (parsedMarketCapMin != null || parsedMarketCapMax != null) {
      filters.marketCapCr = { min: parsedMarketCapMin, max: parsedMarketCapMax };
    }
    if (parsedPriceMin != null || parsedPriceMax != null) {
      filters.priceRange = { min: parsedPriceMin, max: parsedPriceMax };
    }

    const options =
      scanMode === 'range'
        ? { mode: 'historical' as const, fromDate, toDate, filters }
        : { mode: 'today' as const, filters };

    try {
      await runScreener(
        scopedList,
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
  }, [
    scanning,
    stockList,
    scanMode,
    fromDate,
    toDate,
    resolveUniverse,
    selectedPatterns,
    selectedIndexIds,
    marketCapMin,
    marketCapMax,
    priceMin,
    priceMax,
  ]);

  const stopScan = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    setResults([]);
    setProgress({ scanned: 0, total: 0, found: 0 });
    setError(null);
  }, [
    scanMode,
    fromDate,
    toDate,
    selectedIndexIds,
    selectedPatterns,
    marketCapMin,
    marketCapMax,
    priceMin,
    priceMax,
  ]);

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
        case 'ath': {
          const dA = a.allTimeHigh ? ((a.currentPrice - a.allTimeHigh) / a.allTimeHigh) : 0;
          const dB = b.allTimeHigh ? ((b.currentPrice - b.allTimeHigh) / b.allTimeHigh) : 0;
          cmp = dA - dB;
          break;
        }
        case 'swot': {
          const score = (r: ScreenerResult) =>
            r.swotStrengths != null &&
            r.swotWeaknesses != null &&
            r.swotOpportunities != null &&
            r.swotThreats != null
              ? (r.swotStrengths + r.swotOpportunities) - (r.swotWeaknesses + r.swotThreats)
              : -Infinity;
          cmp = score(a) - score(b);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [results, sortKey, sortDir]);

  const visibleFoundCount = sortedResults.length;

  const pct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  const activeFilterCount =
    (selectedPatterns.length > 0 ? 1 : 0) +
    (selectedIndexIds.length > 0 ? 1 : 0) +
    (marketCapMin || marketCapMax ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0);

  const clearFilters = () => {
    setSelectedIndexIds([]);
    setSelectedPatterns([]);
    setMarketCapMin('');
    setMarketCapMax('');
    setPriceMin('');
    setPriceMax('');
  };

  return (
    <PageLayout className="w-full mt-3" title={PAGE_COPY.screener.title} description={PAGE_COPY.screener.description}>
      <div className="w-full space-y-4">
      <div className="rounded-2xl border border-border dark:border-border-dark bg-gradient-to-r from-surface to-surface-muted dark:from-surface-dark dark:to-surface-dark-muted p-4 shadow-sm">
        <SectionHeader title="Scan controls" />

        <div className="mt-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border dark:scrollbar-thumb-border-dark">
          <div className="flex items-end gap-1.5 min-w-max">
          <div className="shrink-0">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">Scan mode</p>
            <div className="flex gap-0.5 bg-surface-muted dark:bg-surface-dark-muted rounded-lg p-0.5 border border-border dark:border-border-dark">
            {(['today', 'range'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (scanMode !== mode) setScanMode(mode);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                  scanMode === mode
                    ? 'bg-surface dark:bg-surface-dark text-accent shadow-sm'
                    : 'text-ink-muted hover:text-ink-primary dark:hover:text-ink-dark-primary'
                }`}
              >
                {mode === 'today' ? 'Today' : 'Date range'}
              </button>
            ))}
            </div>
          </div>

          {scanMode === 'range' && (
            <>
              <label className="shrink-0">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">From</p>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="input-field !w-[150px] !py-2 !px-2.5 text-xs"
                />
              </label>
              <label className="shrink-0">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted dark:text-ink-dark-muted">To</p>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setToDate(e.target.value)}
                  className="input-field !w-[150px] !py-2 !px-2.5 text-xs"
                />
              </label>
            </>
          )}

          <MultiSelectDropdown
            label="Index"
            options={INDEX_OPTIONS.map((index) => ({ value: index.id, label: index.label }))}
            selected={selectedIndexIds}
            onChange={(values) => {
              setSelectedIndexIds(values);
            }}
            emptyText="All NSE Stocks"
          />

          <MultiSelectDropdown
            label="Pattern"
            options={PATTERN_OPTIONS.map((pattern) => ({ value: pattern, label: pattern }))}
            selected={selectedPatterns}
            onChange={(values) => {
              setSelectedPatterns(values.filter((value): value is ScreenerPatternName =>
                PATTERN_OPTIONS.includes(value as ScreenerPatternName),
              ));
            }}
          />

          <RangeDropdown
            label="Price (Rs)"
            min={priceMin}
            max={priceMax}
            onMinChange={setPriceMin}
            onMaxChange={setPriceMax}
            minPlaceholder="0"
            maxPlaceholder="Any"
            sliderMin={0}
            sliderMax={200000}
            sliderStep={1}
          />

          <RangeDropdown
            label="Market Cap (Cr)"
            min={marketCapMin}
            max={marketCapMax}
            onMinChange={setMarketCapMin}
            onMaxChange={setMarketCapMax}
            minPlaceholder="0"
            maxPlaceholder="Any"
            sliderMin={0}
            sliderMax={2000000}
            sliderStep={100}
          />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {scanning ? (
            <button
              onClick={stopScan}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => startScan()}
              className="btn-primary !py-2 !px-4"
            >
              Scan
            </button>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="btn-secondary !py-2 !px-3"
          >
            Reset
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs flex-wrap">
          <span className="text-ink-secondary dark:text-ink-dark-secondary">
            {activeFilterCount > 0 ? `${activeFilterCount} filter groups active` : 'No extra filters active'}
          </span>

          <span className="text-ink-muted dark:text-ink-dark-muted">
            {selectedIndexIds.length === 0 ? 'Universe: All NSE' : `Universe: ${selectedIndexIds.length} selected index${selectedIndexIds.length > 1 ? 'es' : ''}`}
          </span>
        </div>

        {(scanning || progress.total > 0) && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>
                {loadingList || loadingIndexUniverse
                  ? 'Fetching stock list...'
                  : scanning
                    ? `Scanning ${progress.scanned} / ${progress.total} stocks...`
                    : `Scan complete — ${progress.scanned} stocks scanned`}
              </span>
              <span className="font-semibold text-blue-600">
                {(scanning ? progress.found : visibleFoundCount)} pattern{(scanning ? progress.found : visibleFoundCount) !== 1 ? 's' : ''} found
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

      {sortedResults.length === 0 && !scanning && progress.total > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-7 text-center min-h-[160px] flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No patterns found{scanMode === 'range' ? ' in the selected date range' : ' for today'}.
          </p>
        </div>
      )}

      {sortedResults.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1280px]">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <TableSerialHeader sticky />
                  <SortHeader label="Stock" k="name" current={sortKey} dir={sortDir} onSort={toggleSort} align="left" stickyAfterSerial />
                  <SortHeader label="Signal" k="signal" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="SWOT" k="swot" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Pattern date" k="patternDate" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Current Price" k="cmp" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="% vs Buy" k="distBuy" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Buy Price" k="buyPrice" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist Low" k="distLow" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Dist High" k="distHigh" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="DIST ATH" k="ath" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Market Cap" k="mcap" current={sortKey} dir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, rowIndex) => (
                  <tr
                    key={r.symbol}
                    className="group border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => viewStock(r.symbol)}
                  >
                    <TableSerialCell index={rowIndex} sticky />
                    <td className="relative p-3 pr-12 text-left sticky left-11 z-10 bg-white dark:bg-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{r.shortName}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{r.symbol}</p>
                      <div
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AddToWatchlistButton
                          symbol={r.symbol}
                          shortName={r.shortName}
                          variant="icon"
                          thesis={{
                            entryBuyPrice: r.match.buyPrice,
                            patternDate: r.match.candle3.date,
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <SignalBadge signal={r.signal} />
                    </td>
                    <td className="p-3 text-right font-mono text-xs">
                      {r.swotStrengths != null && r.swotWeaknesses != null && r.swotOpportunities != null && r.swotThreats != null ? (
                        <span>
                          <span className="text-emerald-600 dark:text-emerald-400">{r.swotStrengths}</span>
                          <span className="text-ink-muted dark:text-ink-dark-muted">/</span>
                          <span className="text-red-600 dark:text-red-400">{r.swotWeaknesses}</span>
                          <span className="text-ink-muted dark:text-ink-dark-muted">/</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{r.swotOpportunities}</span>
                          <span className="text-ink-muted dark:text-ink-dark-muted">/</span>
                          <span className="text-red-600 dark:text-red-400">{r.swotThreats}</span>
                        </span>
                      ) : (
                        '—'
                      )} 
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
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekLow && r.currentPrice > r.fiftyTwoWeekLow ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekLow)}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.fiftyTwoWeekHigh && r.currentPrice >= r.fiftyTwoWeekHigh ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekHigh)}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${
                      r.allTimeHigh && r.currentPrice >= r.allTimeHigh ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtDistPct(r.currentPrice, r.allTimeHigh)}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-500 dark:text-gray-400 text-xs">
                      {r.marketCapCr ? fmtMarketCapCr(r.marketCapCr) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length === 0 && !scanning && progress.total === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-7 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Click <strong>Scan Now</strong> to start scanning for patterns.
          </p>
        </div>
      )}
      </div>
    </PageLayout>
  );
}

function SortHeader({ label, k, current, dir, onSort, align = 'right', stickyAfterSerial }: {
  label: string; k: SortKey; current: SortKey; dir: SortDir;
  onSort: (key: SortKey) => void; align?: 'left' | 'right';
  stickyAfterSerial?: boolean;
}) {
  const isActive = current === k;
  return (
    <th
      className={`p-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap
        ${align === 'left'
          ? stickyAfterSerial
            ? 'text-left sticky left-11 z-10 bg-gray-100 dark:bg-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]'
            : 'text-left sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]'
          : 'text-right'}
        ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400'}`}
      onClick={() => onSort(k)}
    >
      {label}
      {isActive && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}
