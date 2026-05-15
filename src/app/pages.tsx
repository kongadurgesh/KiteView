import type { JSX } from 'react';
import type { Page } from '../components/layout/types';
import { OverviewPage } from '../features/overview/OverviewPage';
import { ScreenerPage } from '../features/screener/ScreenerPage';
import { HeatmapPage } from '../features/heatmap/HeatmapPage';
import { LookupPage } from '../features/lookup/LookupPage';
import { StockComparePage } from '../features/compare/ComparePage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { AboutPage } from '../features/about/AboutPage';

export interface PageProps {
  onNavigate: (page: Page) => void;
  onViewStock: (symbol: string) => void;
  onCompare: (symbol: string) => void;
  compareSeedSymbol: string | null;
  onSeedConsumed: () => void;
  isHeatmapActive: boolean;
  lookupSeedSymbol: string | null;
  onLookupSeedConsumed: () => void;
}

export const PAGE_COMPONENTS = {
  overview: ({ onNavigate }: PageProps) => <OverviewPage onNavigate={onNavigate} />,
  screener: ({ onViewStock }: PageProps) => <ScreenerPage onViewStock={onViewStock} />,
  heatmap: ({ onViewStock, isHeatmapActive }: PageProps) => (
    <HeatmapPage onViewStock={onViewStock} isActive={isHeatmapActive} />
  ),
  lookup: ({ onCompare, lookupSeedSymbol, onLookupSeedConsumed }: PageProps) => (
    <LookupPage
      onCompare={onCompare}
      seedSymbol={lookupSeedSymbol}
      onSeedConsumed={onLookupSeedConsumed}
    />
  ),
  compare: ({ compareSeedSymbol, onSeedConsumed }: PageProps) => (
    <StockComparePage seedSymbol={compareSeedSymbol} onSeedConsumed={onSeedConsumed} />
  ),
  portfolio: () => <PortfolioPage />,
  about: () => <AboutPage />,
} satisfies Record<Page, (props: PageProps) => JSX.Element>;
