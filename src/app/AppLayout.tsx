import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppShell } from '../components/layout/AppShell';
import { PersistentOutlet } from './PersistentOutlet';
import { WatchlistProvider } from '../features/watchlist/WatchlistProvider';
import { initTheme, getTheme, toggleTheme } from '../utils/theme';
import { AuthProvider } from '../auth/AuthProvider';
import { createAppTheme } from '../theme/appTheme';

export function AppLayout() {
  const location = useLocation();
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const theme = useMemo(() => createAppTheme(isDark ? 'dark' : 'light'), [isDark]);

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
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
      </ThemeProvider>
    </AuthProvider>
  );
}
