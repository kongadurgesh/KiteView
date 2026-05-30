import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseIcon from '@mui/icons-material/Close';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { fetchChartBatch, fetchStatsBatch } from '../../services/apiBatch';
import { PageLayout } from '../../components/layout/PageLayout';
import { PAGE_COPY } from '../../content/pageCopy';
import { fmtInr, fmtMarketCap, fmtPct, fmtRatio } from '../../lib/format';
import type { StockStats } from '../../types/stockStats';
import { SectionHeader } from '../../components/ui';

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
  const navigate = useNavigate();
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

  const theme = useTheme();

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  }, [navigate]);

  return (
    <PageLayout className="max-w-7xl mt-6">
      <Stack spacing={2.25} sx={{ position: 'relative', isolation: 'isolate' }}>
        {/* ambient blobs */}
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
            opacity: 0.34,
            background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(59,130,246,0.14) 55%, transparent 72%)',
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
            opacity: 0.24,
            background: 'radial-gradient(circle, rgba(244,63,94,0.24) 0%, rgba(14,165,233,0.12) 58%, transparent 76%)',
          }}
        />

        {/* hero */}
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
              'radial-gradient(1200px 180px at 0% -10%, rgba(245,158,11,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(244,63,94,0.12), transparent 55%)',
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
                onClick={handleBack}
                sx={{ mb: 1, px: 0.5, minWidth: 0, textTransform: 'none', justifyContent: 'flex-start' }}
              >
                Back
              </Button>
              <Typography variant="h5" sx={{ mb: 0.75 }}>
                {PAGE_COPY.compare.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.compare.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label="Up to 4 stocks" color="primary" variant="outlined" />
                <Chip size="small" label="Normalized chart" color="secondary" variant="outlined" />
                <Chip size="small" label="Key metrics" color="success" variant="outlined" />
              </Stack>
            </Box>
            <Box />
          </Stack>
        </Paper>

        {/* search / symbol selector panel */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, sm: 2 },
            border: '1px solid',
            borderColor: 'divider',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
          }}
        >
          <SectionHeader title="Add stocks to compare" />

          {/* selected chips */}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5, mb: 1.5, minHeight: 36 }}>
            {symbols.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ py: 0.5, fontStyle: 'italic' }}>
                No stocks selected
              </Typography>
            )}
            {symbols.map((sym, i) => (
              <Chip
                key={sym}
                label={sym}
                size="small"
                onDelete={() => removeSymbol(sym)}
                deleteIcon={<CloseIcon fontSize="small" />}
                sx={{
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: CHART_COLORS[i % CHART_COLORS.length],
                  borderColor: CHART_COLORS[i % CHART_COLORS.length],
                  bgcolor: alpha(CHART_COLORS[i % CHART_COLORS.length], theme.palette.mode === 'dark' ? 0.14 : 0.08),
                  '& .MuiChip-deleteIcon': { color: CHART_COLORS[i % CHART_COLORS.length] },
                }}
                variant="outlined"
              />
            ))}
          </Stack>

          {/* search input + dropdown */}
          <Box ref={wrapperRef} sx={{ position: 'relative', maxWidth: 560 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder={symbols.length >= 4 ? 'Maximum 4 stocks' : 'Search to add stock…'}
                disabled={symbols.length >= 4}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: suggestions.length > 0 && showDropdown ? (
                      <InputAdornment position="end">
                        <CircularProgress size={14} />
                      </InputAdornment>
                    ) : undefined,
                    sx: { borderRadius: 1, fontFamily: 'monospace', fontWeight: 600 },
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={symbols.length >= 4 || !input.trim()}
                sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700, flexShrink: 0 }}
              >
                Add
              </Button>
            </Box>

            {showDropdown && symbols.length < 4 && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  zIndex: 20,
                  maxHeight: 224,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                {suggestions.length === 0 ? (
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                      No matches
                    </Typography>
                  </Box>
                ) : (
                  suggestions.map((s, idx) => (
                    <MenuItem
                      key={s.symbol}
                      selected={idx === activeIdx}
                      onMouseDown={() => {
                        if (!symbols.includes(s.symbol)) addSymbol(s.symbol);
                      }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                    >
                      <Box>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {s.symbol}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {s.shortname}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {s.exchange === 'NSI' ? 'NSE' : 'BSE'}
                      </Typography>
                    </MenuItem>
                  ))
                )}
              </Paper>
            )}
          </Box>
        </Paper>

        {/* empty state */}
        {symbols.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              border: '1px dashed',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.75 }}>
              {PAGE_COPY.compare.emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PAGE_COPY.compare.emptyDescription}
            </Typography>
          </Paper>
        )}

        {/* add-another nudge */}
        {symbols.length === 1 && !activeBenchmark && (
          <Paper
            elevation={0}
            sx={{ p: { xs: 2, sm: 2.5 }, border: '1px dashed', borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary">
              Add another stock for the comparison table, or turn on an index overlay to chart vs Nifty / Sensex.
            </Typography>
          </Paper>
        )}

        {/* normalized chart */}
        {showNormalizedChart && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              border: '1px solid',
              borderColor: 'divider',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                  : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2.5 }}>
              <SectionHeader title="Normalized % change" />

              <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
                {/* benchmark toggle */}
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Index
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={benchmarkMode}
                    onChange={(_, v: BenchmarkMode | null) => v && setBenchmarkMode(v)}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      p: 0.25,
                      border: '1px solid',
                      borderColor: 'divider',
                      '& .MuiToggleButton-root': { border: 0, borderRadius: 1, px: 1.25, textTransform: 'none', fontWeight: 600, fontSize: 11 },
                    }}
                  >
                    {BENCHMARK_OPTIONS.map((opt) => (
                      <ToggleButton key={opt.mode} value={opt.mode}>
                        {opt.mode === 'off' ? 'Off' : opt.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>

                {/* range toggle */}
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={range}
                  onChange={(_, v: RangeKey | null) => v && setRange(v)}
                  sx={{
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    p: 0.25,
                    border: '1px solid',
                    borderColor: 'divider',
                    '& .MuiToggleButton-root': { border: 0, borderRadius: 1, px: 1.5, textTransform: 'none', fontWeight: 600, fontSize: 12 },
                  }}
                >
                  {RANGE_OPTIONS.map(({ key, label }) => (
                    <ToggleButton key={key} value={key}>{label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            <Box sx={{ height: { xs: 240, sm: 320 }, width: '100%' }}>
              {chartLoading ? (
                <Stack height="100%" alignItems="center" justifyContent="center" spacing={1}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">Loading chart…</Typography>
                </Stack>
              ) : chartRows.length === 0 ? (
                <Stack height="100%" alignItems="center" justifyContent="center">
                  <Typography variant="body2" color="text.secondary">
                    Not enough overlapping data for this range.
                  </Typography>
                </Stack>
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
            </Box>
          </Paper>
        )}

        {/* comparison metrics table */}
        {symbols.length >= 2 && (
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                  : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
            }}
          >
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <SectionHeader title="Comparison" />
              {statsLoading && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CircularProgress size={12} />
                  <Typography variant="caption" color="text.secondary">
                    Updating…
                  </Typography>
                </Stack>
              )}
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 14 }}
              >
                <Box
                  component="thead"
                  sx={{
                    bgcolor: 'action.hover',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box component="tr">
                    <Box
                      component="th"
                      sx={{
                        textAlign: 'left',
                        px: { xs: 2, sm: 2.5 },
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(17,24,39,0.98)' : 'rgba(248,250,252,0.98)',
                        boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
                        color: 'text.secondary',
                      }}
                    >
                      Metric
                    </Box>
                    {symbols.map((sym, i) => (
                      <Box
                        component="th"
                        key={sym}
                        sx={{
                          textAlign: 'right',
                          px: { xs: 2, sm: 2.5 },
                          py: 1.5,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          borderBottom: `2px solid ${CHART_COLORS[i % CHART_COLORS.length]}`,
                        }}
                      >
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {sym}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
                          {statsBySymbol[sym]?.shortName ?? sym}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box component="tbody">
                  {comparisonRows.map((row) => {
                    const highlights = computeRowHighlights(symbols, row.rank, row.value);
                    return (
                      <Box
                        component="tr"
                        key={row.label}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: alpha(theme.palette.divider, 0.65),
                          '&:last-child': { borderBottom: 0 },
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box
                          component="td"
                          sx={{
                            px: { xs: 2, sm: 2.5 },
                            py: 1.25,
                            fontWeight: 600,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            color: 'text.secondary',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(17,24,39,0.98)' : 'rgba(255,255,255,0.98)',
                            boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
                          }}
                        >
                          {row.label}
                        </Box>
                        {symbols.map((sym) => {
                          const h = highlights[sym];
                          return (
                            <Box
                              component="td"
                              key={`${row.label}-${sym}`}
                              sx={{
                                px: { xs: 2, sm: 2.5 },
                                py: 1.25,
                                textAlign: 'right',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                fontSize: 13,
                                bgcolor:
                                  h === 'best'
                                    ? theme.palette.mode === 'dark'
                                      ? 'rgba(16,185,129,0.16)'
                                      : 'rgba(16,185,129,0.1)'
                                    : h === 'worst'
                                      ? theme.palette.mode === 'dark'
                                        ? 'rgba(244,63,94,0.16)'
                                        : 'rgba(244,63,94,0.08)'
                                      : 'transparent',
                              }}
                            >
                              {row.fmt(sym)}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
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
