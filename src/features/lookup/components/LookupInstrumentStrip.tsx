import { Button } from '../../../components/ui';
import { fmtInr } from '../../../lib/format';

interface LookupInstrumentStripProps {
  stockName: string;
  symbol: string;
  currentPrice: number;
  isLoading: boolean;
  canRescan: boolean;
  onRescan: () => void;
  onCompare: () => void;
  onCopyLink: () => void;
  onOpenYahoo: () => void;
}

export function LookupInstrumentStrip({
  stockName,
  symbol,
  currentPrice,
  isLoading,
  canRescan,
  onRescan,
  onCompare,
  onCopyLink,
  onOpenYahoo,
}: LookupInstrumentStripProps) {
  return (
    <div className="card w-full p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="label-caps">Selected</p>
          <h2 className="text-lg font-semibold text-ink-primary dark:text-ink-dark-primary mt-1 truncate">
            {isLoading && !stockName ? '…' : stockName || symbol}
          </h2>
          <p className="font-mono text-sm text-ink-muted dark:text-ink-dark-muted mt-0.5">{symbol}</p>
          <p className="text-xl font-mono font-semibold tabular-nums text-ink-primary dark:text-ink-dark-primary mt-2">
            {currentPrice > 0 ? fmtInr(currentPrice) : isLoading ? '…' : '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="secondary" size="sm" disabled={!canRescan} onClick={onRescan}>
            Rescan
          </Button>
          <Button size="sm" disabled={!symbol || isLoading} onClick={onCompare}>
            Compare
          </Button>
          <Button variant="secondary" size="sm" type="button" disabled={!symbol} onClick={onCopyLink}>
            Copy link
          </Button>
          <Button variant="secondary" size="sm" type="button" disabled={!symbol} onClick={onOpenYahoo}>
            Yahoo
          </Button>
        </div>
      </div>
    </div>
  );
}
