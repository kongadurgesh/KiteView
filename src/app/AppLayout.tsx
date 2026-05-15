import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { initTheme, getTheme, toggleTheme } from '../utils/theme';

export function AppLayout() {
  const location = useLocation();
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
    <AppShell
      isDark={isDark}
      onToggleTheme={handleToggleTheme}
      sidebarExpanded={sidebarExpanded}
      onSidebarExpandChange={setSidebarExpanded}
      mobileMenuOpen={mobileMenuOpen}
      onMobileMenuOpen={setMobileMenuOpen}
    >
      <Outlet />
    </AppShell>
  );
}
