import { Navigate, useSearchParams } from 'react-router-dom';
import { analysisPath } from '../../app/routes';

/** Preserves `/lookup?symbol=` bookmarks by redirecting to Stock Analysis. */
export function LookupRedirect() {
  const [searchParams] = useSearchParams();
  const symbol = searchParams.get('symbol');
  if (symbol?.trim()) {
    return <Navigate to={analysisPath(symbol.trim())} replace />;
  }
  return <Navigate to="/analysis" replace />;
}
