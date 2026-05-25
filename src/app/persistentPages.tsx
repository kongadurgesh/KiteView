import type { ComponentType } from 'react';
import { OverviewPage } from '../features/overview/OverviewPage';
import { ScreenerPage } from '../features/screener/ScreenerPage';
import { HeatmapPage } from '../features/heatmap/HeatmapPage';
import { StockAnalysisPage } from '../features/lookup/StockAnalysisPage';
import { StockComparePage } from '../features/compare/ComparePage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { WatchlistPage } from '../features/watchlist/WatchlistPage';
import { IndicesPage } from '../features/indices/IndicesPage';
import { AboutPage } from '../features/about/AboutPage';

export interface PersistentPageConfig {
  path: string;
  Component: ComponentType;
}

/** Paths kept mounted after first visit (scroll + React state preserved). */
export const PERSISTENT_PAGES: PersistentPageConfig[] = [
  { path: '/', Component: OverviewPage },
  { path: '/screener', Component: ScreenerPage },
  { path: '/heatmap', Component: HeatmapPage },
  { path: '/analysis', Component: StockAnalysisPage },
  { path: '/compare', Component: StockComparePage },
  { path: '/portfolio', Component: PortfolioPage },
  { path: '/watchlist', Component: WatchlistPage },
  { path: '/indices', Component: IndicesPage },
  { path: '/about', Component: AboutPage },
];

export const PERSISTENT_PATHS = new Set(PERSISTENT_PAGES.map((p) => p.path));

export function normalizeRoutePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}
