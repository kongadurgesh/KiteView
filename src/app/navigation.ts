import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Page } from '../components/layout/types';
import { comparePath, lookupPath, pageToPath } from './routes';

export function useAppNavigation() {
  const navigate = useNavigate();

  const goToPage = useCallback((page: Page) => {
    navigate(pageToPath(page));
  }, [navigate]);

  const viewStock = useCallback((symbol: string) => {
    navigate(lookupPath(symbol));
  }, [navigate]);

  const compareStock = useCallback((symbol: string) => {
    navigate(comparePath(symbol));
  }, [navigate]);

  return { goToPage, viewStock, compareStock };
}
