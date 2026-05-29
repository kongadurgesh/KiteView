import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
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

const INDEX_OPTIONS = heatmapIndicesByGroup('indian')
  .filter((opt) => HEATMAP_INDICES.some((item) => item.id === opt.id) && opt.id !== 'all')
  .filter((opt, index, arr) => {
    const key = opt.label.trim().toLowerCase();
    return index === arr.findIndex((item) => item.label.trim().toLowerCase() === key);
  });

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
  minWidth = 136,
  maxWidth = 176,
  menuMinWidth = 176,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
  minWidth?: number;
  maxWidth?: number;
  menuMinWidth?: number;
}) {
  const theme = useTheme();
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
    const menuWidth = Math.min(Math.max(rect.width, menuMinWidth), window.innerWidth - 16);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - menuWidth - 8));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 16);
    setMenuStyle({ position: 'fixed', left, top, width: menuWidth, zIndex: 60 });
  }, [open, menuMinWidth]);

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
    <Box ref={rootRef} sx={{ position: 'relative', minWidth, width: '100%', maxWidth, flexShrink: 0 }}>
      <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        variant="outlined"
        fullWidth
        sx={{
          justifyContent: 'space-between',
          textTransform: 'none',
          borderRadius: 1,
          py: 1,
          px: 1.25,
          minHeight: 38,
          borderColor: 'divider',
          color: 'text.primary',
          bgcolor: 'background.paper',
          '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.03) },
        }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1, fontSize: 12 }}>
          {summary}
        </Box>
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>▾</Box>
      </Button>
      {open && createPortal(
        <Paper ref={menuRef} style={menuStyle} variant="outlined" sx={{ borderRadius: 1, boxShadow: '0 18px 36px rgba(15,23,42,0.22)' }}>
          <Box sx={{ maxHeight: 256, overflow: 'auto', p: 1 }}>
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <Box
                  key={option.value}
                  component="label"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRadius: 1,
                    px: 1.25,
                    py: 0.75,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox size="small" checked={checked} onChange={() => toggle(option.value)} sx={{ p: 0.5 }} />
                  <Typography sx={{ fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.25 }}>
                    {option.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>,
        document.body,
      )}
    </Box>
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
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
}) {
  const theme = useTheme();
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
    <Box ref={rootRef} sx={{ position: 'relative', minWidth: 136, maxWidth: 176, width: '100%', flexShrink: 0 }}>
      <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        variant="outlined"
        fullWidth
        sx={{
          justifyContent: 'space-between',
          textTransform: 'none',
          borderRadius: 1,
          py: 1,
          px: 1.25,
          minHeight: 38,
          borderColor: 'divider',
          color: 'text.primary',
          bgcolor: 'background.paper',
          '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.03) },
        }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1, fontSize: 12 }}>
          {summary}
        </Box>
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>▾</Box>
      </Button>
      {open && createPortal(
        <Paper ref={menuRef} style={menuStyle} variant="outlined" sx={{ p: 1.5, borderRadius: 1, boxShadow: '0 18px 36px rgba(15,23,42,0.22)' }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Range Scroll
            </Typography>
            <Box sx={{ position: 'relative', height: 28 }}>
              <Box sx={{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, top: '50%', height: 6, transform: 'translateY(-50%)', borderRadius: 99, bgcolor: 'divider' }} />
              <Box
                sx={{ pointerEvents: 'none', position: 'absolute', top: '50%', height: 6, transform: 'translateY(-50%)', borderRadius: 99, bgcolor: 'primary.main' }}
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
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Range: {sliderMin.toLocaleString()} to {sliderMax.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            <Box component="label" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              <Box component="span" sx={{ mb: 0.75, display: 'block' }}>Min</Box>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={min}
                onChange={(event) => onMinChange(event.target.value)}
                placeholder={minPlaceholder}
                style={{
                  width: '100%',
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${theme.palette.divider}`,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  background: theme.palette.background.paper,
                }}
              />
            </Box>
            <Box component="label" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              <Box component="span" sx={{ mb: 0.75, display: 'block' }}>Max</Box>
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={max}
                onChange={(event) => onMaxChange(event.target.value)}
                placeholder={maxPlaceholder}
                style={{
                  width: '100%',
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${theme.palette.divider}`,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  background: theme.palette.background.paper,
                }}
              />
            </Box>
          </Box>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button
              type="button"
              onClick={() => {
                onMinChange('');
                onMaxChange('');
              }}
              size="small"
              variant="text"
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              size="small"
              variant="contained"
            >
              Done
            </Button>
          </Stack>
        </Paper>,
        document.body,
      )}
    </Box>
  );
}

function SignalBadge({ signal }: { signal: 'BUY' | 'WAIT' }) {
  const isBuy = signal === 'BUY';
  return (
    <Chip
      size="small"
      label={signal}
      sx={{
        height: 22,
        borderRadius: 1,
        fontSize: 11,
        fontWeight: 700,
        color: isBuy ? '#fff' : 'warning.dark',
        bgcolor: isBuy ? 'success.main' : (theme) => alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.2 : 0.22),
      }}
    />
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
  const theme = useTheme();
  const { viewStock, goToPage } = useAppNavigation();
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
    <PageLayout className="max-w-7xl mt-6">
      <Stack spacing={2.25} sx={{ position: 'relative', isolation: 'isolate' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: { xs: 240, md: 320 },
            height: { xs: 240, md: 320 },
            borderRadius: '50%',
            top: -100,
            left: -100,
            filter: 'blur(38px)',
            opacity: 0.36,
            background: 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(59,130,246,0.14) 55%, transparent 72%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: { xs: 260, md: 340 },
            height: { xs: 260, md: 340 },
            borderRadius: '50%',
            bottom: -120,
            right: -80,
            filter: 'blur(42px)',
            opacity: 0.28,
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(168,85,247,0.12) 58%, transparent 76%)',
          }}
        />

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            minHeight: { xs: 190, md: 176 },
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
            position: 'relative',
            background:
              'radial-gradient(1200px 180px at 0% -10%, rgba(37,99,235,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(13,148,136,0.12), transparent 55%)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.5,
              pointerEvents: 'none',
              background:
                'linear-gradient(120deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.03) 70%)',
              transform: 'translateX(-40%)',
              animation: 'ovHeroSweep 6s ease-in-out infinite',
            }}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ minHeight: '100%' }}>
            <Box>
              <Button
                variant="text"
                size="small"
                startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                onClick={() => goToPage('overview')}
                sx={{ mb: 1, px: 0.5, minWidth: 0, textTransform: 'none', justifyContent: 'flex-start' }}
              >
                Back to Overview
              </Button>
              <Typography variant="h5" sx={{ mb: 0.75 }}>
                {PAGE_COPY.screener.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.screener.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label="Live Scan" color="primary" variant="outlined" />
                <Chip size="small" label="Historical Breakouts" color="secondary" variant="outlined" />
                <Chip size="small" label="Multiple Patterns" color="success" variant="outlined" />
              </Stack>
            </Box>

            <Box />
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            p: { xs: 1.5, sm: 2 },
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
          }}
        >
          <SectionHeader title="Scan controls" />

          <Box sx={{ mt: 1.5, overflowX: 'auto', overflowY: 'hidden', pb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ minWidth: 'max-content' }}>
              <Box sx={{ minWidth: 130 }}>
                <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                  Scan mode
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={scanMode}
                  onChange={(_, value: ScanMode | null) => value && setScanMode(value)}
                  size="small"
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 0.25,
                    border: '1px solid',
                    borderColor: 'divider',
                    '& .MuiToggleButton-root': {
                      border: 0,
                      borderRadius: 1,
                      px: 1.25,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: 12,
                    },
                  }}
                >
                  <ToggleButton value="today">Today</ToggleButton>
                  <ToggleButton value="range">Date range</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {scanMode === 'range' && (
                <>
                  <Box component="label" sx={{ minWidth: 150 }}>
                    <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                      From
                    </Typography>
                    <Box
                      component="input"
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      sx={{
                        width: '100%',
                        height: 38,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        px: 1.25,
                        fontSize: 12,
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                      }}
                    />
                  </Box>
                  <Box component="label" sx={{ minWidth: 150 }}>
                    <Typography variant="caption" sx={{ mb: 0.75, display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                      To
                    </Typography>
                    <Box
                      component="input"
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setToDate(e.target.value)}
                      sx={{
                        width: '100%',
                        height: 38,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        px: 1.25,
                        fontSize: 12,
                        color: 'text.primary',
                        bgcolor: 'background.paper',
                      }}
                    />
                  </Box>
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
                minWidth={148}
                maxWidth={188}
                menuMinWidth={260}
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
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            {scanning ? (
              <Button onClick={stopScan} color="error" variant="outlined">
                Stop
              </Button>
            ) : (
              <Button onClick={() => startScan()} variant="contained">
                Scan
              </Button>
            )}
            <Button type="button" onClick={clearFilters} variant="outlined" color="inherit">
              Reset
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between" sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {activeFilterCount > 0 ? `${activeFilterCount} filter groups active` : 'No extra filters active'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedIndexIds.length === 0 ? 'Universe: All NSE' : `Universe: ${selectedIndexIds.length} selected index${selectedIndexIds.length > 1 ? 'es' : ''}`}
            </Typography>
          </Stack>

          {(scanning || progress.total > 0) && (
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">
                  {loadingList || loadingIndexUniverse
                    ? 'Fetching stock list...'
                    : scanning
                      ? `Scanning ${progress.scanned} / ${progress.total} stocks...`
                      : `Scan complete - ${progress.scanned} stocks scanned`}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {(scanning ? progress.found : visibleFoundCount)} pattern{(scanning ? progress.found : visibleFoundCount) !== 1 ? 's' : ''} found
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={pct}
                color={scanning ? 'primary' : 'success'}
                sx={{ height: 8, borderRadius: 999, bgcolor: alpha(theme.palette.text.primary, 0.12) }}
              />
            </Box>
          )}
        </Paper>

      {error && (
        <Alert severity="error" variant="outlined">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {sortedResults.length === 0 && !scanning && progress.total > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 3.5,
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No patterns found{scanMode === 'range' ? ' in the selected date range' : ' for today'}.
          </Typography>
        </Paper>
      )}

      {sortedResults.length > 0 && (
        <Paper variant="outlined" sx={{ overflow: 'hidden', boxShadow: '0 3px 14px rgba(15,23,42,0.05)' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 1280, borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
              <Box component="thead" sx={{ bgcolor: 'action.hover' }}>
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
              </Box>
              <Box component="tbody">
                {sortedResults.map((r, rowIndex) => (
                  <Box
                    component="tr"
                    key={r.symbol}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 180ms ease',
                      '&:hover': { bgcolor: 'action.hover' },
                      '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                    }}
                    onClick={() => viewStock(r.symbol)}
                  >
                    <TableSerialCell index={rowIndex} sticky />
                    <Box
                      component="td"
                      sx={{
                        position: 'sticky',
                        left: 44,
                        zIndex: 10,
                        p: 1.5,
                        pr: 6,
                        textAlign: 'left',
                        bgcolor: 'background.paper',
                        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.14)',
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {r.shortName}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.symbol}</Typography>
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'inline-flex',
                          opacity: { xs: 1, sm: 0 },
                          transition: 'opacity 160ms ease',
                          'tr:hover &': { opacity: 1 },
                        }}
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
                      </Box>
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right' }}>
                      <SignalBadge signal={r.signal} />
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                      {r.swotStrengths != null && r.swotWeaknesses != null && r.swotOpportunities != null && r.swotThreats != null ? (
                        <Box component="span">
                          <Box component="span" sx={{ color: 'success.main' }}>{r.swotStrengths}</Box>
                          <Box component="span" sx={{ color: 'text.secondary' }}>/</Box>
                          <Box component="span" sx={{ color: 'error.main' }}>{r.swotWeaknesses}</Box>
                          <Box component="span" sx={{ color: 'text.secondary' }}>/</Box>
                          <Box component="span" sx={{ color: 'success.main' }}>{r.swotOpportunities}</Box>
                          <Box component="span" sx={{ color: 'text.secondary' }}>/</Box>
                          <Box component="span" sx={{ color: 'error.main' }}>{r.swotThreats}</Box>
                        </Box>
                      ) : (
                        '—'
                      )} 
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                      {r.match.candle3.date}
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right', fontFamily: 'monospace', color: 'text.primary' }}>
                      {r.currentPrice ? fmtNumber(r.currentPrice) : '—'}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          !r.match.buyPrice || !r.currentPrice
                            ? 'text.secondary'
                            : r.currentPrice >= r.match.buyPrice
                              ? 'success.main'
                              : 'error.main',
                      }}
                    >
                      {fmtDistPct(r.currentPrice, r.match.buyPrice)}
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right', fontFamily: 'monospace', color: 'text.primary' }}>
                      {fmtNumber(r.match.buyPrice)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: r.fiftyTwoWeekLow && r.currentPrice > r.fiftyTwoWeekLow ? 'success.main' : 'error.main',
                      }}
                    >
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekLow)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: r.fiftyTwoWeekHigh && r.currentPrice >= r.fiftyTwoWeekHigh ? 'success.main' : 'error.main',
                      }}
                    >
                      {fmtDistPct(r.currentPrice, r.fiftyTwoWeekHigh)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 700,
                        color: r.allTimeHigh && r.currentPrice >= r.allTimeHigh ? 'success.main' : 'error.main',
                      }}
                    >
                      {fmtDistPct(r.currentPrice, r.allTimeHigh)}
                    </Box>
                    <Box component="td" sx={{ p: 1.5, textAlign: 'right', fontFamily: 'monospace', color: 'text.secondary', fontSize: 12 }}>
                      {r.marketCapCr ? fmtMarketCapCr(r.marketCapCr) : '—'}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {results.length === 0 && !scanning && progress.total === 0 && (
        <Paper variant="outlined" sx={{ p: 3.5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Click <strong>Scan Now</strong> to start scanning for patterns.
          </Typography>
        </Paper>
      )}

      </Stack>
    </PageLayout>
  );
}

function SortHeader({ label, k, current, dir, onSort, align = 'right', stickyAfterSerial }: {
  label: string; k: SortKey; current: SortKey; dir: SortDir;
  onSort: (key: SortKey) => void; align?: 'left' | 'right';
  stickyAfterSerial?: boolean;
}) {
  const isActive = current === k;
  const stickyLeft = align === 'left' ? (stickyAfterSerial ? 44 : 0) : undefined;
  return (
    <th
      style={{
        padding: '12px',
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textAlign: align,
        position: align === 'left' ? 'sticky' : 'static',
        left: stickyLeft,
        zIndex: align === 'left' ? 10 : undefined,
        background: align === 'left' ? 'var(--mui-palette-action-hover)' : undefined,
        boxShadow: align === 'left' ? '2px 0 4px -2px rgba(0,0,0,0.14)' : undefined,
        color: isActive ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)',
      }}
      onClick={() => onSort(k)}
    >
      {label}
      {isActive && <span style={{ marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}
