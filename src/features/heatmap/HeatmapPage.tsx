import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMatch, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowDropUpRoundedIcon from '@mui/icons-material/ArrowDropUpRounded';
import ArrowDropDownRoundedIcon from '@mui/icons-material/ArrowDropDownRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAppNavigation } from '../../app/navigation';
import { fetchScreenerList, ScreenerStock } from '../../utils/screener';
import { HEATMAP_INDICES, heatmapIndicesByGroup, getHeatmapIndexOption, isHeatmapIndexId } from '../../data/heatmapIndices';
import { fetchIndexConstituents } from '../../services/indexConstituents';
import { PageLayout } from '../../components/layout/PageLayout';
import { SectionHeader } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import { ALL_INDICES } from '../../data/indicesCatalog';
import { fmtInrCompact, fmtQuotePct, fmtTime } from '../../lib/format';
import {
  fetchIndexQuotes,
  formatIndexPrice,
  INDEX_QUOTE_REFRESH_MS,
  type IndexQuote,
} from '../../services/indexQuotes';
import { fetchHeatmapBatch, type HeatmapTimeframe, type QuoteFull } from '../../utils/fetchStockData';

const TIMEFRAME_OPTIONS: { key: HeatmapTimeframe; label: string }[] = [
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '1y', label: '1Y' },
];

const AUTO_REFRESH_MS = 120_000;

function tickerLabel(symbol: string): string {
  return symbol.replace(/\.(NS|BO|L|DE|PA|AX|HK|T)$/i, '');
}

function tileDisplayName(name: string, symbol: string): string {
  const trimmed = name.trim();
  const bare = tickerLabel(symbol);
  if (!trimmed) return '';
  if (trimmed.toUpperCase() === symbol.toUpperCase() || trimmed.toUpperCase() === bare.toUpperCase()) {
    return '';
  }
  return trimmed;
}

/** Bright red (losses) or bright green (gains) only — no yellow/gray blend on the gradient. */
const HEAT_RED_LIGHT = { r: 254, g: 142, b: 142 };
const HEAT_RED = { r: 239, g: 68, b: 68 };
const HEAT_RED_DEEP = { r: 220, g: 38, b: 38 };
const HEAT_GREEN_LIGHT = { r: 134, g: 239, b: 172 };
const HEAT_GREEN = { r: 34, g: 197, b: 94 };
const HEAT_GREEN_DEEP = { r: 22, g: 163, b: 74 };
const HEAT_FLAT = { r: 229, g: 231, b: 235 };

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function rgb(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function mixRgb(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  t: number,
): string {
  return rgb({
    r: lerpChannel(from.r, to.r, t),
    g: lerpChannel(from.g, to.g, t),
    b: lerpChannel(from.b, to.b, t),
  });
}

function heatColor(pct: number): string {
  const c = Math.max(-4, Math.min(4, pct));
  const t = Math.min(Math.abs(c) / 3, 1);

  if (c > 0.08) {
    return mixRgb(HEAT_GREEN_LIGHT, t > 0.55 ? HEAT_GREEN_DEEP : HEAT_GREEN, t);
  }
  if (c < -0.08) {
    return mixRgb(HEAT_RED_LIGHT, t > 0.55 ? HEAT_RED_DEEP : HEAT_RED, t);
  }
  return rgb(HEAT_FLAT);
}

/** For legend bar: pure red → pure green (no intermediate hues). */
const HEAT_LEGEND_GRADIENT = `linear-gradient(to right, ${rgb(HEAT_RED_DEEP)}, ${rgb(HEAT_GREEN_DEEP)})`;


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
  const { viewStock, goToPage } = useAppNavigation();
  const theme = useTheme();
  const isActive = useMatch({ path: '/heatmap', end: true }) != null;
  const [searchParams, setSearchParams] = useSearchParams();
  const [allStocks, setAllStocks] = useState<ScreenerStock[]>([]);
  const [remoteStocks, setRemoteStocks] = useState<ScreenerStock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState('nifty50');
  const [timeframe, setTimeframe] = useState<HeatmapTimeframe>('1d');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [displayQuotes, setDisplayQuotes] = useState<QuoteFull[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedIndexQuote, setSelectedIndexQuote] = useState<IndexQuote | null>(null);
  const [indexQuoteLoading, setIndexQuoteLoading] = useState(false);

  const cache = useRef(new Map<string, QuoteFull>());
  const runId = useRef(0);

  useEffect(() => {
    const fromUrl = searchParams.get('index');
    if (fromUrl && isHeatmapIndexId(fromUrl) && fromUrl !== selectedIndex) {
      setSelectedIndex(fromUrl);
    }
  }, [searchParams, selectedIndex]);

  const handleIndexChange = useCallback(
    (id: string) => {
      setSelectedIndex(id);
      if (isHeatmapIndexId(id)) {
        setSearchParams({ index: id }, { replace: true });
      }
    },
    [setSearchParams],
  );

  const selectedOption = getHeatmapIndexOption(selectedIndex) ?? HEATMAP_INDICES[0];
  const selectedIndexInstrument = useMemo(
    () => ALL_INDICES.find((instrument) => instrument.id === selectedIndex) ?? null,
    [selectedIndex],
  );

  const currentStocks = useMemo(() => {
    if (selectedOption.source.type === 'slice') {
      if (allStocks.length === 0) return [];
      const end = selectedOption.source.end === Infinity
        ? allStocks.length
        : selectedOption.source.end;
      return allStocks.slice(selectedOption.source.start, Math.min(end, allStocks.length));
    }
    return remoteStocks;
  }, [allStocks, remoteStocks, selectedOption]);

  useEffect(() => {
    if (selectedOption.source.type === 'slice') {
      setRemoteStocks([]);
      return;
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const data = await fetchIndexConstituents(selectedIndex);
        if (!cancelled) {
          setRemoteStocks(data.stocks);
        }
      } catch (err) {
        if (!cancelled) {
          setRemoteStocks([]);
          setError(err instanceof Error ? err.message : 'Failed to load index constituents');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedIndex, selectedOption.source.type]);

  const cacheKey = useCallback((symbol: string, tf: HeatmapTimeframe) => `${symbol}:${tf}`, []);

  const loadQuotes = useCallback(async (stocks: ScreenerStock[], tf: HeatmapTimeframe, force: boolean) => {
    const id = ++runId.current;
    setLoading(true);
    setError(null);

    if (stocks.length === 0) {
      setDisplayQuotes([]);
      setLoading(false);
      return;
    }

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

    const nameBySymbol = new Map(stocks.map((s) => [s.symbol, s.shortName]));

    for (let i = 0; i < needed.length; i += 50) {
      if (runId.current !== id) return;
      const batch = needed.slice(i, i + 50).map((s) => s.symbol);
      try {
        const results = await fetchHeatmapBatch(batch, tf);
        for (const q of results) {
          if (q.regularMarketPrice > 0) {
            const fallbackName = nameBySymbol.get(q.symbol);
            const shortName =
              tileDisplayName(q.shortName, q.symbol) ||
              tileDisplayName(fallbackName ?? '', q.symbol) ||
              q.shortName.trim();
            cache.current.set(cacheKey(q.symbol, tf), { ...q, shortName });
          }
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

  const refreshSelectedIndexQuote = useCallback(async (withLoading: boolean) => {
    if (!selectedIndexInstrument) {
      setSelectedIndexQuote(null);
      setIndexQuoteLoading(false);
      return;
    }

    if (withLoading) setIndexQuoteLoading(true);

    try {
      if (timeframe === '1d') {
        const quotes = await fetchIndexQuotes([selectedIndexInstrument]);
        setSelectedIndexQuote(quotes[0] ?? null);
      } else {
        const results = await fetchHeatmapBatch([selectedIndexInstrument.symbol], timeframe);
        const result = results[0];
        if (result) {
          setSelectedIndexQuote({
            instrument: selectedIndexInstrument,
            price: result.regularMarketPrice,
            change: null,
            changePct: result.changePercent,
          });
        } else {
          setSelectedIndexQuote(null);
        }
      }
    } finally {
      if (withLoading) setIndexQuoteLoading(false);
    }
  }, [selectedIndexInstrument, timeframe]);

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
    let cancelled = false;

    const load = async (withLoading: boolean) => {
      if (cancelled) return;
      await refreshSelectedIndexQuote(withLoading);
    };

    void load(true);

    if (!isActive || !selectedIndexInstrument) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = setInterval(() => {
      if (document.hidden) return;
      void load(false);
    }, INDEX_QUOTE_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isActive, selectedIndexInstrument, refreshSelectedIndexQuote, timeframe]);

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

  const heatmapDesc = `${PAGE_COPY.heatmap.description} Colored by ${timeframeLabel} change.${
    lastUpdated ? ` Last updated ${fmtTime(lastUpdated)}.` : ''
  }`;

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
            background:
              'radial-gradient(1200px 180px at 0% -10%, rgba(37,99,235,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(13,148,136,0.12), transparent 55%)',
            overflow: 'hidden',
            position: 'relative',
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
                {PAGE_COPY.heatmap.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {heatmapDesc}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label="Indian & Global Indices" color="primary" variant="outlined" />
                <Chip size="small" label="Live Heatmap" color="secondary" variant="outlined" />
                <Chip size="small" label="Timeframe View" color="success" variant="outlined" />
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
          <SectionHeader
            title="Filters"
            action={
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="contained"
                size="small"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshRoundedIcon fontSize="small" />}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            }
          />

          <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1.5} useFlexGap sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Index
              </Typography>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={selectedIndex}
                  onChange={(e) => handleIndexChange(e.target.value)}
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <ListSubheader>Indian</ListSubheader>
                  {heatmapIndicesByGroup('indian').map((idx) => (
                    <MenuItem key={idx.id} value={idx.id}>{idx.label}</MenuItem>
                  ))}
                  <ListSubheader>Global</ListSubheader>
                  {heatmapIndicesByGroup('global').map((idx) => (
                    <MenuItem key={idx.id} value={idx.id}>{idx.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              {indexQuoteLoading ? (
                <Typography variant="caption" color="text.secondary">Loading...</Typography>
              ) : selectedIndexQuote?.price != null ? (
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>
                  {formatIndexPrice(selectedIndexQuote)}
                  <Box component="span" sx={{ ml: 0.75, color: (selectedIndexQuote.changePct ?? 0) >= 0 ? 'success.main' : 'error.main' }}>
                    ({fmtQuotePct(selectedIndexQuote.changePct)})
                  </Box>
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">Unavailable</Typography>
              )}
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Period
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={timeframe}
                onChange={(_, value: HeatmapTimeframe | null) => value && setTimeframe(value)}
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
                {TIMEFRAME_OPTIONS.map(({ key, label }) => (
                  <ToggleButton key={key} value={key}>{label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            {!loading && displayQuotes.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {displayQuotes.length} stocks
                </Typography>
                <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', color: 'success.main', fontWeight: 700 }}>
                  <ArrowDropUpRoundedIcon sx={{ fontSize: 16 }} />
                  {gainers}
                </Typography>
                <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', color: 'error.main', fontWeight: 700 }}>
                  <ArrowDropDownRoundedIcon sx={{ fontSize: 16 }} />
                  {losers}
                </Typography>
                {unchanged > 0 && (
                  <Typography variant="caption" color="text.secondary">{unchanged} flat</Typography>
                )}
              </Stack>
            )}

            <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: { xs: 0, sm: 'auto' }, display: { xs: 'none', sm: 'flex' } }}>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>-3%</Typography>
              <Box
                sx={{
                  height: 10,
                  width: 128,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: HEAT_LEGEND_GRADIENT,
                }}
              />
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>+3%</Typography>
            </Stack>
          </Stack>

          {loading && progress.total > 0 && (
            <Box sx={{ mt: 1.25 }}>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{ height: 6, borderRadius: 999, bgcolor: alpha(theme.palette.text.primary, 0.12) }}
              />
              <Typography sx={{ mt: 0.75, fontSize: 10, color: 'text.secondary' }}>
                Loading {progress.loaded} / {progress.total} stocks...
              </Typography>
            </Box>
          )}
        </Paper>

        {error && (
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        )}

        {loading && displayQuotes.length === 0 && (
          <Paper variant="outlined" sx={{ p: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">Fetching market data...</Typography>
          </Paper>
        )}

        {displayQuotes.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'grey.950' : 'grey.100',
              borderColor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.300',
              overflow: 'hidden',
              p: 0.75,
            }}
          >
            <Box sx={{ position: 'relative', width: '100%', pt: `${(CH / CW) * 100}%` }}>
              <Box sx={{ position: 'absolute', inset: 0 }}>
              {rects.map((r) => {
                const pctX = (r.x / CW) * 100;
                const pctY = (r.y / CH) * 100;
                const pctW = (r.w / CW) * 100;
                const pctH = (r.h / CH) * 100;
                const sizeFactor = Math.sqrt(pctW * pctH);
                const showName = sizeFactor > 1.2;
                const showChange = sizeFactor > 1.8;
                const showPrice = sizeFactor > 5;
                const fontSize = sizeFactor > 7 ? 15 : sizeFactor > 5 ? 13 : sizeFactor > 3 ? 11 : sizeFactor > 2 ? 9 : 7;
                const changePct = r.quote.changePercent;
                const companyName = tileDisplayName(r.quote.shortName, r.quote.symbol);
                const ticker = tickerLabel(r.quote.symbol);
                const isFlat = Math.abs(changePct) <= 0.08;
                const isLightTile =
                  isFlat ||
                  (changePct > 0 && Math.abs(changePct) < 0.6) ||
                  (changePct < 0 && Math.abs(changePct) < 0.6);
                const textColor = isLightTile ? '#111827' : '#ffffff';
                const shadowColor = isLightTile ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
                const tooltipTitle = `${companyName || r.quote.shortName} (${ticker})\n${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%\n₹${r.quote.regularMarketPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

                return (
                  <Tooltip
                    key={r.quote.symbol}
                    title={tooltipTitle}
                    placement="top"
                    slotProps={{
                      popper: {
                        modifiers: [
                          {
                            name: 'offset',
                            options: {
                              offset: [0, -8],
                            },
                          },
                        ],
                      },
                    }}
                  >
                    <ButtonBase
                      component={Box}
                      style={{
                        left: `calc(${pctX}% + 1px)`,
                        top: `calc(${pctY}% + 1px)`,
                        width: `calc(${pctW}% - 2px)`,
                        height: `calc(${pctH}% - 2px)`,
                        backgroundColor: heatColor(changePct),
                        fontSize: `${fontSize}px`,
                        color: textColor,
                        textShadow: `0 1px 2px ${shadowColor}`,
                      }}
                      sx={{
                        position: 'absolute',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 0.5,
                        transition: theme.transitions.create(['filter', 'boxShadow', 'elevation'], {
                          duration: theme.transitions.duration.shortest,
                        }),
                        '&:hover': {
                          filter: 'brightness(1.25)',
                          boxShadow: `0 0 0 2px ${theme.palette.background.paper}, inset 0 0 0 2px ${theme.palette.common.white}`,
                        },
                        '&:active': {
                          filter: 'brightness(1.15)',
                        },
                      }}
                      onClick={() => viewStock(r.quote.symbol)}
                      aria-label={`View ${companyName || r.quote.shortName} (${ticker})`}
                    >
                      {showName && companyName && (
                        <Box
                          component="span"
                          style={{ fontSize: `${fontSize}px`, lineHeight: 1.15 }}
                          sx={{ fontWeight: 700, maxWidth: '100%', px: 0.5, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {companyName}
                        </Box>
                      )}
                      {showChange && (
                        <Box component="span" sx={{ fontWeight: 600, lineHeight: 1.1, opacity: 0.9 }} style={{ fontSize: `${Math.max(fontSize - 2, 7)}px` }}>
                          {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                        </Box>
                      )}
                      {showPrice && (
                        <Box component="span" sx={{ lineHeight: 1.1, mt: 0.5, opacity: 0.7 }} style={{ fontSize: `${Math.max(fontSize - 3, 7)}px` }}>
                          {fmtInrCompact(r.quote.regularMarketPrice)}
                        </Box>
                      )}
                    </ButtonBase>
                  </Tooltip>
                );
              })}
              </Box>
            </Box>
          </Paper>
        )}

        {!loading && displayQuotes.length === 0 && !error && (
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No data available. Click Refresh to load.</Typography>
          </Paper>
        )}

        <style>{`
          @keyframes ovHeroSweep {
            0%, 100% { transform: translateX(-45%); }
            50% { transform: translateX(45%); }
          }
        `}</style>
      </Stack>
    </PageLayout>
  );
}
