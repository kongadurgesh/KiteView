import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { useAppNavigation } from '../../app/navigation';
import type { Page } from '../../components/layout/types';
import { PageLayout } from '../../components/layout/PageLayout';
import { PAGE_COPY } from '../../content/pageCopy';

const PREVIEW_ROOT = 'relative h-full w-full min-h-0 overflow-hidden';

type CardAccent = 'blue' | 'teal' | 'violet' | 'amber' | 'emerald' | 'rose' | 'sky' | 'slate';

const ACCENT_STYLES: Record<
  CardAccent,
  { borderColor: string; glowColor: string; chipBg: string; chipFg: string }
> = {
  blue: {
    borderColor: '#3b82f6',
    glowColor: 'rgba(59,130,246,0.16)',
    chipBg: 'rgba(59,130,246,0.14)',
    chipFg: '#1d4ed8',
  },
  teal: {
    borderColor: '#14b8a6',
    glowColor: 'rgba(20,184,166,0.16)',
    chipBg: 'rgba(20,184,166,0.14)',
    chipFg: '#0f766e',
  },
  violet: {
    borderColor: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.16)',
    chipBg: 'rgba(139,92,246,0.14)',
    chipFg: '#6d28d9',
  },
  amber: {
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.16)',
    chipBg: 'rgba(245,158,11,0.14)',
    chipFg: '#92400e',
  },
  emerald: {
    borderColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.16)',
    chipBg: 'rgba(16,185,129,0.14)',
    chipFg: '#047857',
  },
  rose: {
    borderColor: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.16)',
    chipBg: 'rgba(244,63,94,0.14)',
    chipFg: '#be123c',
  },
  sky: {
    borderColor: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.16)',
    chipBg: 'rgba(14,165,233,0.14)',
    chipFg: '#0369a1',
  },
  slate: {
    borderColor: '#64748b',
    glowColor: 'rgba(100,116,139,0.16)',
    chipBg: 'rgba(100,116,139,0.14)',
    chipFg: '#334155',
  },
};

function OverviewNavCard({
  title,
  blurb,
  accent,
  preview,
  onClick,
}: {
  title: string;
  blurb: string;
  accent: CardAccent;
  preview: ReactNode;
  onClick: () => void;
}) {
  const theme = useTheme();
  const styles = ACCENT_STYLES[accent];

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        minHeight: 220,
        height: '100%',
        overflow: 'hidden',
        borderColor: 'divider',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
        transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: theme.transitions.duration.standard,
        }),
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
          background: `radial-gradient(120% 85% at 0% 0%, ${styles.glowColor}, transparent 55%)`,
          transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.standard }),
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 30px rgba(15, 23, 42, 0.12)',
          borderColor: styles.borderColor,
        },
        '&:hover::before': {
          opacity: 1,
        },
      }}
    >
      <CardActionArea onClick={onClick} aria-label={`Open ${title}`} sx={{ height: '100%', alignItems: 'stretch' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, height: '100%', p: 2 }}>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              overflow: 'hidden',
              height: 112,
              transition: theme.transitions.create(['transform', 'box-shadow'], {
                duration: theme.transitions.duration.standard,
              }),
              '.MuiCard-root:hover &': {
                transform: 'scale(1.015)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              },
            }}
          >
            {preview}
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ mt: 'auto', alignItems: 'flex-end' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                {title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {blurb}
              </Typography>
            </Box>

            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: styles.chipBg,
                color: styles.chipFg,
                transition: theme.transitions.create(['transform', 'background-color', 'color'], {
                  duration: theme.transitions.duration.standard,
                }),
                '.MuiCard-root:hover &': {
                  transform: 'scale(1.08)',
                  bgcolor: styles.borderColor,
                  color: '#fff',
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1,
                  transition: theme.transitions.create('transform', { duration: theme.transitions.duration.short }),
                  '.MuiCard-root:hover &': { transform: 'translateX(2px)' },
                }}
              >
                →
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ScreenerPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="ml-auto h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
      </div>
      <div className="absolute left-2 right-2 top-7 space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-12 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
            <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
            <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 160}ms` }} />
          </div>
        ))}
      </div>
      <div className="absolute left-2 right-2 top-7 h-2 rounded bg-blue-500/15 ov-scan" />
    </div>
  );
}

function HeatmapPreview({ animated }: { animated: boolean }) {
  const tiles = [
    { l: '2%', t: '8%', w: '38%', h: '46%', c: 'bg-emerald-500/70' },
    { l: '42%', t: '8%', w: '26%', h: '26%', c: 'bg-rose-500/70' },
    { l: '70%', t: '8%', w: '28%', h: '18%', c: 'bg-gray-400/70' },
    { l: '42%', t: '38%', w: '26%', h: '16%', c: 'bg-emerald-500/55' },
    { l: '70%', t: '28%', w: '28%', h: '26%', c: 'bg-rose-500/55' },
    { l: '2%', t: '56%', w: '22%', h: '40%', c: 'bg-rose-500/65' },
    { l: '26%', t: '56%', w: '32%', h: '18%', c: 'bg-gray-400/65' },
    { l: '26%', t: '76%', w: '18%', h: '20%', c: 'bg-emerald-500/65' },
    { l: '46%', t: '76%', w: '22%', h: '20%', c: 'bg-rose-500/60' },
    { l: '70%', t: '56%', w: '28%', h: '40%', c: 'bg-emerald-500/60' },
  ];

  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute inset-0 rounded-md bg-gray-100 dark:bg-gray-950/60 overflow-hidden">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`absolute rounded-sm ${t.c} ${animated ? 'ov-heat' : ''}`}
            style={{ left: t.l, top: t.t, width: t.w, height: t.h, animationDelay: `${i * 120}ms` }}
          />
        ))}
        <div className="absolute left-2 bottom-1.5 flex items-center gap-2 text-[9px] text-gray-600 dark:text-gray-300">
          <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-rose-500/70 via-gray-300/70 to-emerald-500/70" />
          <span className="font-semibold">1D / 1W / 1M / 1Y</span>
        </div>
      </div>
    </div>
  );
}

function LookupPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />

      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-6 flex-1 rounded-md bg-gray-100 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 flex items-center px-2">
          <div className="h-2 w-20 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
        </div>
        <div className="h-6 w-12 rounded-md bg-blue-600/90" />
      </div>

      <div className="absolute left-2 right-2 top-10 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '180ms' }} />
          <div className={`ml-auto h-2 w-2 rounded-full ${animated ? 'ov-pulse' : ''} bg-emerald-500`} />
        </div>
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '240ms' }} />
        <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  );
}

function ComparePreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute inset-0 rounded-md bg-gray-100 dark:bg-gray-950/60 overflow-hidden">
        <div className="absolute left-0 right-0 top-2 px-2 flex items-center gap-2">
          <div className="h-2 w-12 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="ml-auto h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '120ms' }} />
        </div>

        <div className="absolute inset-x-2 top-7 bottom-2">
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-300 dark:border-gray-700" />
          <div className={`absolute left-0 top-0 h-7 w-[50%] rounded-md bg-blue-500/25 ${animated ? 'ov-float' : ''}`} />
          <div className={`absolute right-0 bottom-0 h-8 w-[50%] rounded-md bg-emerald-500/25 ${animated ? 'ov-float2' : ''}`} />
          <div className="absolute left-1 bottom-1 h-0.5 w-14 rounded bg-blue-500/70" />
          <div className="absolute left-1 bottom-2.5 h-0.5 w-10 rounded bg-emerald-500/70" />
          <div className="absolute left-1 bottom-4 h-0.5 w-12 rounded bg-rose-500/60" />
        </div>
      </div>
    </div>
  );
}

function PortfolioPreview({ animated }: { animated: boolean }) {
  const bars = [
    { w: '78%', c: 'bg-blue-500/70' },
    { w: '46%', c: 'bg-emerald-500/70' },
    { w: '32%', c: 'bg-rose-500/60' },
    { w: '24%', c: 'bg-amber-500/60' },
  ];

  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-2 w-16 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
        <div className="ml-auto h-2 w-10 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '140ms' }} />
      </div>
      <div className="absolute left-2 right-2 top-8 space-y-1.5">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 130}ms` }} />
            <div className={`h-2 rounded ${b.c} ${animated ? 'ov-weight' : ''}`} style={{ width: b.w, animationDelay: `${i * 220}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-3 space-y-2">
        {['BUY', 'WAIT', 'BUY'].map((sig, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${sig === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'}`}>
              {sig}
            </span>
            <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
            <span className="text-amber-400 text-[10px]">★</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndicesPreview({ animated }: { animated: boolean }) {
  const chips = [
    { label: 'Nifty', c: 'text-emerald-600' },
    { label: 'USD/INR', c: 'text-gray-600 dark:text-gray-400' },
    { label: 'Gold', c: 'text-amber-600' },
    { label: 'BTC', c: 'text-orange-500' },
  ];
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 overflow-hidden" />
      <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-3 px-2 ${animated ? 'ticker-marquee-track' : ''}`} style={animated ? { width: 'max-content' } : undefined}>
        {[...chips, ...chips].map((chip, i) => (
          <span key={i} className={`text-[9px] font-semibold whitespace-nowrap ${chip.c}`}>
            {chip.label} +0.4%
          </span>
        ))}
      </div>
    </div>
  );
}

function AboutPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className={`size-9 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0 ${animated ? 'ov-ring' : ''}`} />
        <div className="space-y-1.5 min-w-0">
          <div className="h-2 w-24 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="h-2 w-32 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '160ms' }} />
        </div>
      </div>
      <div className="absolute left-3 right-3 bottom-3 space-y-1.5">
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '220ms' }} />
        <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

const TOOL_NAV: {
  key: keyof typeof PAGE_COPY.toolCards;
  page: Page;
  accent: CardAccent;
  preview: (animated: boolean) => ReactNode;
  wide?: boolean;
}[] = [
  { key: 'screener', page: 'screener', accent: 'blue', preview: (a) => <ScreenerPreview animated={a} />, wide: true },
  { key: 'heatmap', page: 'heatmap', accent: 'teal', preview: (a) => <HeatmapPreview animated={a} /> },
  { key: 'indices', page: 'indices', accent: 'sky', preview: (a) => <IndicesPreview animated={a} /> },
  { key: 'analysis', page: 'analysis', accent: 'violet', preview: (a) => <LookupPreview animated={a} /> },
  { key: 'compare', page: 'compare', accent: 'amber', preview: (a) => <ComparePreview animated={a} /> },
  { key: 'watchlist', page: 'watchlist', accent: 'rose', preview: (a) => <WatchlistPreview animated={a} /> },
  { key: 'portfolio', page: 'portfolio', accent: 'emerald', preview: (a) => <PortfolioPreview animated={a} /> },
  { key: 'about', page: 'about', accent: 'slate', preview: (a) => <AboutPreview animated={a} /> },
];

export function OverviewPage() {
  const { goToPage } = useAppNavigation();
  const reduceMotion = useReducedMotion();
  const animated = !reduceMotion;

  const cardTransition = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' as const };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: cardTransition },
  };

  const cards = PAGE_COPY.toolCards;

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
            animation: reduceMotion ? 'none' : 'ovHeroSweep 6s ease-in-out infinite',
          }}
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ minHeight: '100%' }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 0.75 }}>
              {PAGE_COPY.overview.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PAGE_COPY.overview.description}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
              <Chip size="small" label="Live Scans" color="primary" variant="outlined" />
              <Chip size="small" label="Smart Watchlists" color="secondary" variant="outlined" />
              <Chip size="small" label="Portfolio Analytics" color="success" variant="outlined" />
            </Stack>
          </Box>

          <Box />
        </Stack>
        </Paper>

        <Grid
          container
          spacing={2}
          initial="hidden"
          animate="show"
          component={motion.div}
          variants={{
            hidden: {},
            show: reduceMotion
              ? {}
              : {
                  transition: { staggerChildren: 0.06, delayChildren: 0.03 },
                },
          }}
          sx={{ alignItems: 'stretch' }}
        >
          {TOOL_NAV.map(({ key, page, accent, preview, wide }) => {
            const copy = cards[key];
            return (
              <Grid
                key={key}
                size={{ xs: 12, md: 6, lg: wide ? 8 : 4 }}
                sx={{ display: 'flex', minHeight: 220 }}
              >
                <Box
                  component={motion.div}
                  variants={item}
                  transition={cardTransition}
                  sx={{ width: '100%', height: '100%' }}
                >
                  <OverviewNavCard
                    title={copy.title}
                    blurb={copy.blurb}
                    accent={accent}
                    preview={preview(animated)}
                    onClick={() => goToPage(page)}
                  />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Stack>

      <style>{`
        @keyframes ovHeroSweep {
          0%, 100% { transform: translateX(-45%); }
          50% { transform: translateX(45%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ov-anim * { animation: none !important; transition: none !important; }
        }

        .ov-shimmer {
          background: linear-gradient(90deg, rgba(229,231,235,.9), rgba(255,255,255,.7), rgba(229,231,235,.9));
          background-size: 200% 100%;
          animation: ovShimmer 1.6s ease-in-out infinite;
        }
        :global(.dark) .ov-shimmer {
          background: linear-gradient(90deg, rgba(31,41,55,.9), rgba(17,24,39,.75), rgba(31,41,55,.9));
          background-size: 200% 100%;
        }
        @keyframes ovShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ov-scan {
          animation: ovScan 2.2s ease-in-out infinite;
        }
        @keyframes ovScan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: .8; }
          50% { transform: translateY(18px); opacity: .45; }
          100% { transform: translateY(36px); opacity: 0; }
        }

        .ov-heat {
          animation: ovHeat 3.6s ease-in-out infinite;
        }
        @keyframes ovHeat {
          0%, 100% { filter: saturate(1) brightness(1); opacity: .85; }
          50% { filter: saturate(1.25) brightness(1.06); opacity: .95; }
        }

        .ov-pulse {
          animation: ovPulse 1.4s ease-in-out infinite;
        }
        @keyframes ovPulse {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.35); opacity: 1; }
        }

        .ov-float {
          animation: ovFloat 3.2s ease-in-out infinite;
        }
        .ov-float2 {
          animation: ovFloat2 3.8s ease-in-out infinite;
        }
        @keyframes ovFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        @keyframes ovFloat2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .ov-weight {
          transform-origin: left center;
          animation: ovWeight 2.8s ease-in-out infinite;
        }
        @keyframes ovWeight {
          0%, 100% { transform: scaleX(1); opacity: .9; }
          50% { transform: scaleX(.92); opacity: 1; }
        }

        .ov-ring {
          position: relative;
          background: radial-gradient(circle at 30% 30%, rgba(59,130,246,.35), transparent 60%),
                      radial-gradient(circle at 70% 70%, rgba(16,185,129,.28), transparent 55%),
                      rgba(229,231,235,.9);
          animation: ovRing 5.5s linear infinite;
        }
        :global(.dark) .ov-ring {
          background: radial-gradient(circle at 30% 30%, rgba(59,130,246,.32), transparent 60%),
                      radial-gradient(circle at 70% 70%, rgba(16,185,129,.22), transparent 55%),
                      rgba(31,41,55,.9);
        }
        @keyframes ovRing {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(25deg); }
        }
      `}</style>
    </PageLayout>
  );
}
