import { Link } from 'react-router-dom';
import { pageToPath } from '../../../app/routes';

export function PatternNoMatchCard({ symbol }: { symbol: string }) {
  return (
    <div className="card p-5 border-dashed">
      <p className="label-caps mb-2">Bullish pattern</p>
      <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary">
        No qualifying <strong>Bullish Harami</strong> or <strong>Bullish Engulfing</strong> in the last 1Y for{' '}
        <strong>{symbol}</strong>.
      </p>
      <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-3">
        Use the{' '}
        <Link to={pageToPath('screener')} className="text-accent font-medium hover:underline">
          Screener
        </Link>{' '}
        to scan the market for fresh breakouts.
      </p>
    </div>
  );
}
