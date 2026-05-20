import { Link } from 'react-router-dom';
import { pageToPath } from '../../../app/routes';
import { PAGE_COPY } from '../../../content/pageCopy';

export function PatternNoMatchCard({ symbol }: { symbol: string }) {
  return (
    <div className="card p-5 border-dashed">
      <p className="label-caps mb-2">Bullish pattern</p>
      <p className="body-text">
        {PAGE_COPY.analysis.noPattern} <strong>{symbol}</strong>
      </p>
      <p className="section-desc mt-3">
        Use the{' '}
        <Link to={pageToPath('screener')} className="text-accent font-medium hover:underline">
          Screener
        </Link>{' '}
        to scan the market for fresh breakouts.
      </p>
    </div>
  );
}
