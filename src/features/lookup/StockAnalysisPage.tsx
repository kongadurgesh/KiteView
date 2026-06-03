import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { useAppNavigation } from '../../app/navigation';
import { analysisPath } from '../../app/routes';
import { PAGE_COPY } from '../../content/pageCopy';
import { PageLayout } from '../../components/layout/PageLayout';
import { Alert, LoadingBlock } from '../../components/ui';
import { SearchField } from '../../components/ui/SearchField';
import { LookupInstrumentStrip } from './components/LookupInstrumentStrip';
import { StockOverviewSection } from './components/StockOverviewSection';
import { SwotSection } from './components/SwotSection';
import { TechnicalSection } from './components/TechnicalSection';
import { QuarterlyResultsSection } from './components/QuarterlyResultsSection';
import { DvmSection } from './components/DvmSection';
import { CompanyProfileSection } from './components/CompanyProfileSection';
import { AnalystSection } from './components/AnalystSection';
import { NewsSection } from './components/NewsSection';
import { BullishPatternSection } from './components/BullishPatternSection';
import { PatternNoMatchCard } from './components/PatternNoMatchCard';
import { useStockAnalysis } from './useStockAnalysis';

export function StockAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { compareStock } = useAppNavigation();
  const analysis = useStockAnalysis();
  const symbolParam = searchParams.get('symbol');
  const skipUrlSyncRef = useRef(false);

  const syncUrl = useCallback(
    (sym: string) => {
      skipUrlSyncRef.current = true;
      setSearchParams({ symbol: sym }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!symbolParam?.trim()) return;
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    void analysis.search(symbolParam.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolParam]);

  const handleSelect = useCallback(
    async (sym: string) => {
      const resolved = await analysis.search(sym);
      if (resolved) syncUrl(resolved);
    },
    [analysis, syncUrl],
  );

  const showInstrument =
    Boolean(analysis.symbol) &&
    (analysis.isLoading || (Boolean(analysis.stockName) && !analysis.error));

  const showAnalysis =
    analysis.hasSearched && !analysis.isLoading && !analysis.error && Boolean(analysis.symbol);

  const copyPageLink = useCallback(() => {
    if (!analysis.symbol) return;
    const url = `${window.location.origin}${analysisPath(analysis.symbol)}`;
    void navigator.clipboard.writeText(url);
  }, [analysis.symbol]);

  const openYahoo = useCallback(() => {
    if (!analysis.symbol) return;
    window.open(`https://finance.yahoo.com/quote/${encodeURIComponent(analysis.symbol)}`, '_blank', 'noopener,noreferrer');
  }, [analysis.symbol]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  }, [navigate]);

  return (
    <PageLayout className="max-w-7xl mt-6">
      <Stack spacing={2.25} sx={{ position: 'relative' }}>
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
            background: 'radial-gradient(circle, rgba(34,197,94,0.26) 0%, rgba(59,130,246,0.14) 55%, transparent 72%)',
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
            background: 'radial-gradient(circle, rgba(245,158,11,0.24) 0%, rgba(14,165,233,0.12) 58%, transparent 76%)',
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
              'radial-gradient(1200px 180px at 0% -10%, rgba(34,197,94,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(245,158,11,0.12), transparent 55%)',
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

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            sx={{ minHeight: '100%' }}
          >
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
                {PAGE_COPY.analysis.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.analysis.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip size="small" label="Overview" color="primary" variant="outlined" />
                <Chip size="small" label="Technical Readouts" color="secondary" variant="outlined" />
                <Chip size="small" label="Price Calculations" color="success" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, sm: 2 },
            border: '1px solid',
            borderColor: 'divider',
            background: 'background.paper',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Search company
            </Typography>
            <SearchField onSelect={handleSelect} isLoading={analysis.isLoading} maxWidth="w-full" className="mx-auto w-full" />
          </Box>
        </Paper>

        {analysis.isLoading && <LoadingBlock message="Loading market data and analysis…" />}

        {analysis.error && (
          <Alert variant="error" title="Error" className="w-full">
            {analysis.error}
          </Alert>
        )}

        {showInstrument && (
          <LookupInstrumentStrip
            stockName={analysis.stockName}
            symbol={analysis.symbol}
            currentPrice={analysis.currentPrice}
            isLoading={analysis.isLoading}
            canRescan={analysis.canRescan}
            onRescan={() => void analysis.search(analysis.symbol)}
            onCompare={() => compareStock(analysis.symbol)}
            onCopyLink={copyPageLink}
            onOpenYahoo={openYahoo}
            watchlistThesis={
              analysis.match
                ? {
                    entryBuyPrice: analysis.match.buyPrice,
                    patternDate: analysis.match.candle3.date,
                  }
                : undefined
            }
          />
        )}

        {showAnalysis && (
          <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Stack spacing={2}>
              <StockOverviewSection
                symbol={analysis.symbol}
                currentPrice={analysis.currentPrice}
                fiftyTwoWeekHigh={analysis.fiftyTwoWeekHigh}
                fiftyTwoWeekLow={analysis.fiftyTwoWeekLow}
                allTimeHigh={analysis.allTimeHigh}
                marketCapCr={analysis.marketCapCr}
                sector={analysis.sector}
                industry={analysis.industry}
                quoteSnapshot={analysis.quoteSnapshot}
                stockStats={analysis.stockStats}
              />
              <SwotSection symbol={analysis.symbol} />
              <QuarterlyResultsSection
                symbol={analysis.symbol}
                data={analysis.quarterlyResults}
                rawData={analysis.quarterlyResultsRaw}
              />
              <TechnicalSection technical={analysis.technical} priceSeries={analysis.priceSeries} />
              <DvmSection dvm={analysis.dvm} />
              <CompanyProfileSection profile={analysis.profile} financials={analysis.financials} />
              <AnalystSection recs={analysis.recommendations} />
              <NewsSection news={analysis.news} />
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
              {analysis.match ? (
                <BullishPatternSection
                  match={analysis.match}
                  currentPrice={analysis.currentPrice}
                  patternChartBars={analysis.patternChartBars}
                />
              ) : (
                <PatternNoMatchCard symbol={analysis.symbol} />
              )}
              </Stack>
            </Grid>
          </Grid>
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
