import { useEffect } from 'react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Alert, Button, Card, LoadingBlock } from '../../components/ui';
import { fmtInr } from '../../lib/format';
import { ResultCard } from './ResultCard';
import { SearchField } from '../../components/ui/SearchField';
import { useLookup } from './useLookup';

interface LookupPageProps {
  onCompare: (symbol: string) => void;
  seedSymbol?: string | null;
  onSeedConsumed?: () => void;
}

export function LookupPage({ onCompare, seedSymbol, onSeedConsumed }: LookupPageProps) {
  const lookup = useLookup();

  useEffect(() => {
    if (seedSymbol) {
      lookup.search(seedSymbol);
      onSeedConsumed?.();
    }
  }, [seedSymbol]);

  return (
    <PageLayout
      narrow
      title="Pattern lookup"
      description="Scan NSE stocks for Bullish Harami or Bullish Engulfing with breakout. Shows buy trigger, buy price, levels, and cap tier."
      centered
    >
      {lookup.lastLookup && (
        <Card className="w-full max-w-lg mb-4" padding>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="label-caps">Last scan</p>
              <p className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary mt-1">
                {lookup.lastLookup.name}{' '}
                <span className="font-mono text-ink-muted">({lookup.lastLookup.symbol})</span>
              </p>
              <p className="text-lg font-mono font-semibold tabular-nums mt-0.5">{fmtInr(lookup.lastLookup.price)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={!lookup.canRescan} onClick={() => lookup.search(lookup.symbol)}>
                Rescan
              </Button>
              <Button size="sm" disabled={!lookup.symbol} onClick={() => onCompare(lookup.symbol)}>
                Compare
              </Button>
            </div>
          </div>
        </Card>
      )}

      <SearchField onSelect={lookup.search} isLoading={lookup.isLoading} className="w-full max-w-lg mx-auto" />

      {lookup.isLoading && <LoadingBlock message="Fetching data and scanning for pattern…" />}

      {lookup.error && (
        <Alert variant="error" title="Error" className="mt-8 max-w-lg w-full">
          {lookup.error}
        </Alert>
      )}

      {lookup.noMatch && !lookup.isLoading && (
        <Alert variant="warning" title="No pattern found" className="mt-8 max-w-lg w-full text-center">
          No Bullish Harami or Bullish Engulfing pattern was detected for <strong>{lookup.symbol}</strong> in the last year of data.
        </Alert>
      )}

      {lookup.match && !lookup.isLoading && (
        <ResultCard
          match={lookup.match}
          stockName={lookup.stockName}
          symbol={lookup.symbol}
          currentPrice={lookup.currentPrice}
          fiftyTwoWeekHigh={lookup.fiftyTwoWeekHigh}
          fiftyTwoWeekLow={lookup.fiftyTwoWeekLow}
          allTimeHigh={lookup.allTimeHigh}
          marketCapCr={lookup.marketCapCr}
          sector={lookup.sector}
          industry={lookup.industry}
        />
      )}
    </PageLayout>
  );
}
