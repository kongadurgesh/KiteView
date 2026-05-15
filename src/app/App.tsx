import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppLayout } from './AppLayout';
import { OverviewPage } from '../features/overview/OverviewPage';
import { ScreenerPage } from '../features/screener/ScreenerPage';
import { HeatmapPage } from '../features/heatmap/HeatmapPage';
import { LookupPage } from '../features/lookup/LookupPage';
import { StockComparePage } from '../features/compare/ComparePage';
import { PortfolioPage } from '../features/portfolio/PortfolioPage';
import { AboutPage } from '../features/about/AboutPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="screener" element={<ScreenerPage />} />
          <Route path="heatmap" element={<HeatmapPage />} />
          <Route path="lookup" element={<LookupPage />} />
          <Route path="compare" element={<StockComparePage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
