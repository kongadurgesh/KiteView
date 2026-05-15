import { useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppShell } from '../components/layout/AppShell';
import type { Page } from '../components/layout/types';
import { PAGE_COMPONENTS } from './pages';
import { initTheme, getTheme, toggleTheme } from '../utils/theme';

export default function App() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [activePage, setActivePage] = useState<Page>('overview');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compareSeedSymbol, setCompareSeedSymbol] = useState<string | null>(null);
  const [lookupSeedSymbol, setLookupSeedSymbol] = useState<string | null>(null);

  useEffect(() => {
    initTheme();
  }, []);

  const handlePageChange = useCallback((page: Page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  }, []);

  const navigateToLookup = useCallback((sym: string) => {
    setLookupSeedSymbol(sym);
    setActivePage('lookup');
  }, []);

  const handleCompare = useCallback((symbol: string) => {
    setCompareSeedSymbol(symbol);
    setActivePage('compare');
  }, []);

  const handleToggleTheme = () => {
    setIsDark(toggleTheme() === 'dark');
  };

  const PageView = PAGE_COMPONENTS[activePage];

  return (
    <>
      <AppShell
        activePage={activePage}
        onNavigate={handlePageChange}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        sidebarExpanded={sidebarExpanded}
        onSidebarExpandChange={setSidebarExpanded}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuOpen={setMobileMenuOpen}
      >
        <PageView
          onNavigate={handlePageChange}
          onViewStock={navigateToLookup}
          onCompare={handleCompare}
          compareSeedSymbol={compareSeedSymbol}
          onSeedConsumed={() => setCompareSeedSymbol(null)}
          isHeatmapActive={activePage === 'heatmap'}
          lookupSeedSymbol={lookupSeedSymbol}
          onLookupSeedConsumed={() => setLookupSeedSymbol(null)}
        />
      </AppShell>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
