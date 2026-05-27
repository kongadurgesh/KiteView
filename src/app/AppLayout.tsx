import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PersistentOutlet } from './PersistentOutlet';
import { WatchlistProvider } from '../features/watchlist/WatchlistProvider';
import { initTheme, getTheme, toggleTheme } from '../utils/theme';
import { AuthProvider } from '../auth/AuthProvider';

export function AppLayout() {
  const location = useLocation();
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleToggleTheme = () => {
    setIsDark(toggleTheme() === 'dark');
  };

  return (
    <AuthProvider>
    <AppShell
      isDark={isDark}
      onToggleTheme={handleToggleTheme}
      sidebarExpanded={sidebarExpanded}
      onSidebarExpandChange={setSidebarExpanded}
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpen={setMobileMenuOpen}
      mainScrollRef={mainScrollRef}
    >
      <WatchlistProvider>
        <PersistentOutlet scrollContainerRef={mainScrollRef} />
      </WatchlistProvider>
    </AppShell>
    </AuthProvider>
  );
}
