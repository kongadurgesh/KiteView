import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppNavigation } from '../../app/navigation';
import { analysisPath } from '../../app/routes';
import { PAGE_COPY } from '../../content/pageCopy';
import { PageLayout } from '../../components/layout/PageLayout';
import { Alert, LoadingBlock } from '../../components/ui';
import { SearchField } from '../../components/ui/SearchField';
import { normalizeNseSymbol } from '../../lib/nseSymbol';
import { LookupInstrumentStrip } from './components/LookupInstrumentStrip';
import { StockOverviewSection } from './components/StockOverviewSection';
import { SwotSection } from './components/SwotSection';
import { TechnicalSection } from './components/TechnicalSection';
import { ChecklistSection } from './components/ChecklistSection';
import { DvmSection } from './components/DvmSection';
import { CompanyProfileSection } from './components/CompanyProfileSection';
import { AnalystSection } from './components/AnalystSection';
import { NewsSection } from './components/NewsSection';
import { BullishPatternSection } from './components/BullishPatternSection';
import { PatternNoMatchCard } from './components/PatternNoMatchCard';
import { useStockAnalysis } from './useStockAnalysis';

export function StockAnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareStock } = useAppNavigation();
  const analysis = useStockAnalysis();
  const symbolParam = searchParams.get('symbol');
  const skipUrlSyncRef = useRef(false);

  const syncUrl = useCallback(
    (sym: string) => {
      const norm = normalizeNseSymbol(sym);
      skipUrlSyncRef.current = true;
      setSearchParams({ symbol: norm }, { replace: true });
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
      await analysis.search(sym);
      syncUrl(sym);
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

  return (
    <PageLayout
      className="max-w-6xl"
      title={PAGE_COPY.analysis.title}
      description={PAGE_COPY.analysis.description}
    >
      <div className="w-full flex flex-col gap-4 items-stretch">
        <SearchField onSelect={handleSelect} isLoading={analysis.isLoading} maxWidth="w-full" className="mx-auto w-full" />

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
          />
        )}

        {showAnalysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <StockOverviewSection
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
              <SwotSection swot={analysis.swot} />
              <TechnicalSection technical={analysis.technical} priceSeries={analysis.priceSeries} />
              <ChecklistSection items={analysis.checklist} />
              <DvmSection dvm={analysis.dvm} />
              <CompanyProfileSection profile={analysis.profile} financials={analysis.financials} />
              <AnalystSection recs={analysis.recommendations} />
              <NewsSection news={analysis.news} />
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
              {analysis.match ? (
                <BullishPatternSection
                  match={analysis.match}
                  currentPrice={analysis.currentPrice}
                  patternChartBars={analysis.patternChartBars}
                />
              ) : (
                <PatternNoMatchCard symbol={analysis.symbol} />
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
