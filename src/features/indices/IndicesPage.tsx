import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { SectionHeader } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import {
  ALL_INDICES,
  INDEX_CATEGORIES,
  indicesByCategory,
  type IndexCategory,
} from '../../data/indicesCatalog';
import {
  heatmapIndexIdFor,
  indexCategoryOpensHeatmap,
} from '../../data/indexHeatmapLinks';
import { fmtQuotePct } from '../../lib/format';
import {
  fetchIndexQuotes,
  formatIndexChange,
  formatIndexPrice,
  INDEX_QUOTE_REFRESH_MS,
  type IndexQuote,
} from '../../services/indexQuotes';

function IndexFlag({ code }: { code: string }) {
  const iso = code.toLowerCase();
  return (
    <Box
      component="img"
      src={`https://flagcdn.com/w20/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 2x`}
      alt=""
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      sx={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 15,
        objectFit: 'cover',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
      }}
    />
  );
}

function IndexCard({
  q,
  onOpenHeatmap,
}: {
  q: IndexQuote;
  onOpenHeatmap?: () => void;
}) {
  const theme = useTheme();
  const isUp = (q.change ?? 0) >= 0;
  const hasData = q.price != null;
  const clickable = onOpenHeatmap != null;
  const flagCode = q.instrument.flagCode;

  const content = (
    <Stack spacing={0.75} sx={{ alignItems: 'flex-start', width: '100%' }}>
      {flagCode && <IndexFlag code={flagCode} />}
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', pr: flagCode ? 3.5 : 0, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {q.instrument.label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>
        {hasData ? formatIndexPrice(q) : '—'}
      </Typography>
      {hasData ? (
        <Typography sx={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: isUp ? 'success.main' : 'error.main' }}>
          {formatIndexChange(q)} ({fmtQuotePct(q.changePct)})
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Unavailable</Typography>
      )}
      {clickable && (
        <Typography sx={{ mt: 0.5, fontSize: 10, fontWeight: 600, color: 'primary.main' }}>
          View heatmap →
        </Typography>
      )}
    </Stack>
  );

  if (!clickable) {
    return (
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          p: 2,
          minHeight: 100,
          display: 'flex',
          alignItems: 'stretch',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.88))'
              : 'linear-gradient(165deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))',
        }}
      >
        {content}
      </Paper>
    );
  }

  return (
    <ButtonBase
      onClick={onOpenHeatmap}
      title={`Open ${q.instrument.label} in Market Heatmap`}
      sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 1 }}
    >
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          p: 2,
          minHeight: 100,
          display: 'flex',
          alignItems: 'stretch',
          transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.shortest,
          }),
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.88))'
              : 'linear-gradient(165deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))',
          '.MuiButtonBase-root:hover &': {
            borderColor: 'primary.main',
            boxShadow: '0 10px 22px rgba(15,23,42,0.08)',
            transform: 'translateY(-1px)',
          },
          '.MuiButtonBase-root.Mui-focusVisible &': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
        }}
      >
        {content}
      </Paper>
    </ButtonBase>
  );
}

function IndexCardSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2, minHeight: 100 }}>
      <Stack spacing={1}>
        <Skeleton variant="rounded" width={96} height={16} />
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={112} height={12} />
      </Stack>
    </Paper>
  );
}

function CategorySection({
  category,
  title,
  quotes,
  loading,
  sectionHint,
  onOpenHeatmap,
}: {
  category: IndexCategory;
  title: string;
  quotes: IndexQuote[];
  loading: boolean;
  sectionHint?: string;
  onOpenHeatmap?: (heatmapIndexId: string) => void;
}) {
  const items = indicesByCategory(category);
  const quoteMap = new Map(quotes.map((q) => [q.instrument.id, q]));
  const heatmapCategory = indexCategoryOpensHeatmap(category);

  return (
    <Stack component="section" spacing={1.25}>
      <SectionHeader title={title} />
      {sectionHint && (
        <Typography sx={{ mt: -0.5, fontSize: 12, color: 'text.secondary' }}>{sectionHint}</Typography>
      )}
      <Grid container spacing={1.5}>
        {loading
          ? items.map((i) => (
              <Grid key={i.id} size={{ xs: 6, sm: 4, lg: 3, xl: 12 / 5 }}>
                <IndexCardSkeleton />
              </Grid>
            ))
          : items.map((instrument) => {
              const heatmapId = heatmapCategory ? heatmapIndexIdFor(instrument) : null;
              return (
                <Grid key={instrument.id} size={{ xs: 6, sm: 4, lg: 3, xl: 12 / 5 }}>
                  <IndexCard
                    q={
                      quoteMap.get(instrument.id) ?? {
                        instrument,
                        price: null,
                        change: null,
                        changePct: null,
                      }
                    }
                    onOpenHeatmap={
                      heatmapId && onOpenHeatmap ? () => onOpenHeatmap(heatmapId) : undefined
                    }
                  />
                </Grid>
              );
            })}
      </Grid>
    </Stack>
  );
}

export function IndicesPage() {
  const navigate = useNavigate();
  const { viewHeatmapIndex } = useAppNavigation();
  const [quotes, setQuotes] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await fetchIndexQuotes(ALL_INDICES);
    setQuotes(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), INDEX_QUOTE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const openHeatmap = useCallback(
    (heatmapIndexId: string) => {
      viewHeatmapIndex(heatmapIndexId);
    },
    [viewHeatmapIndex],
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
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
                onClick={handleBack}
                sx={{ mb: 1, px: 0.5, minWidth: 0, textTransform: 'none', justifyContent: 'flex-start' }}
              >
                Back
              </Button>
              <Typography variant="h5" sx={{ mb: 0.75 }}>
                {PAGE_COPY.indices.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.indices.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label="Live Indices" color="primary" variant="outlined" />
                <Chip size="small" label="Indian & Global Indices" color="secondary" variant="outlined" />
                <Chip size="small" label="Forex and Commodities" color="success" variant="outlined" />
              </Stack>
            </Box>

            <Box />
          </Stack>
        </Paper>

        {INDEX_CATEGORIES.map(({ id, title }) => (
          <CategorySection
            key={id}
            category={id}
            title={title}
            quotes={quotes}
            loading={loading}
            onOpenHeatmap={id === 'indian' || id === 'global' ? openHeatmap : undefined}
          />
        ))}

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
