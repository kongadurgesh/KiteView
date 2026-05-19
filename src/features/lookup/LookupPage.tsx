import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppNavigation } from '../../app/navigation';
import { lookupPath } from '../../app/routes';
import { PageLayout } from '../../components/layout/PageLayout';
import { Alert, LoadingBlock } from '../../components/ui';
import { SearchField } from '../../components/ui/SearchField';
import { normalizeNseSymbol } from '../../lib/nseSymbol';
import { LookupInstrumentStrip } from './components/LookupInstrumentStrip';
import { ResultCard } from './ResultCard';
import { useLookup } from './useLookup';

export function LookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { compareStock } = useAppNavigation();
  const lookup = useLookup();
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
    void lookup.search(symbolParam.trim());
    // Only re-fetch when the URL query changes (not when `lookup` identity changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lookup.search is stable (useCallback [])
  }, [symbolParam]);

  const handleSelect = useCallback(
    async (sym: string) => {
      await lookup.search(sym);
      syncUrl(sym);
    },
    [lookup, syncUrl],
  );

  const showInstrument =
    Boolean(lookup.symbol) &&
    (lookup.isLoading || (Boolean(lookup.stockName) && !lookup.error));

  const copyPageLink = useCallback(() => {
    if (!lookup.symbol) return;
    const url = `${window.location.origin}${lookupPath(lookup.symbol)}`;
    void navigator.clipboard.writeText(url);
  }, [lookup.symbol]);

  const openYahoo = useCallback(() => {
    if (!lookup.symbol) return;
    window.open(`https://finance.yahoo.com/quote/${encodeURIComponent(lookup.symbol)}`, '_blank', 'noopener,noreferrer');
  }, [lookup.symbol]);

  return (
    <PageLayout
      narrow
      title="Pattern lookup"
      description="Scan NSE stocks for Bullish Harami or Bullish Engulfing with breakout. Shows buy trigger, buy price, levels, cap tier, session snapshot, and key stats."
      centered
    >
      <div className="w-full max-w-4xl flex flex-col gap-4 items-stretch">
        <SearchField onSelect={handleSelect} isLoading={lookup.isLoading} maxWidth="w-full" className="mx-auto w-full" />

        {lookup.isLoading && (
          <LoadingBlock message="Fetching data and scanning for pattern…" />
        )}

        {lookup.error && (
          <Alert variant="error" title="Error" className="w-full">
            {lookup.error}
          </Alert>
        )}

        {showInstrument && (
          <LookupInstrumentStrip
            stockName={lookup.stockName}
            symbol={lookup.symbol}
            currentPrice={lookup.currentPrice}
            isLoading={lookup.isLoading}
            canRescan={lookup.canRescan}
            onRescan={() => void lookup.search(lookup.symbol)}
            onCompare={() => compareStock(lookup.symbol)}
            onCopyLink={copyPageLink}
            onOpenYahoo={openYahoo}
          />
        )}

        {lookup.noMatch && !lookup.isLoading && !lookup.error && (
          <Alert variant="warning" title="No pattern found" className="w-full text-center">
            No Bullish Harami or Bullish Engulfing pattern was detected for <strong>{lookup.symbol}</strong> in the last year of data.
          </Alert>
        )}

        {lookup.match && !lookup.isLoading && !lookup.error && (
          <ResultCard
            match={lookup.match}
            currentPrice={lookup.currentPrice}
            fiftyTwoWeekHigh={lookup.fiftyTwoWeekHigh}
            fiftyTwoWeekLow={lookup.fiftyTwoWeekLow}
            allTimeHigh={lookup.allTimeHigh}
            marketCapCr={lookup.marketCapCr}
            sector={lookup.sector}
            industry={lookup.industry}
            quoteSnapshot={lookup.quoteSnapshot}
            stockStats={lookup.stockStats}
            patternChartBars={lookup.patternChartBars}
          />
        )}
      </div>
    </PageLayout>
  );
}
