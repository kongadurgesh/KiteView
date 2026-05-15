import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MarketTicker } from './MarketTicker';
interface AppShellProps {
  isDark: boolean;
  onToggleTheme: () => void;
  sidebarExpanded: boolean;
  onSidebarExpandChange: (expanded: boolean) => void;
  mobileMenuOpen: boolean;
  onMobileMenuOpen: (open: boolean) => void;
  children: ReactNode;
}

export function AppShell({
  isDark,
  onToggleTheme,
  sidebarExpanded,
  onSidebarExpandChange,
  mobileMenuOpen,
  onMobileMenuOpen,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface-muted dark:bg-surface-dark">
      <Sidebar
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onExpandChange={onSidebarExpandChange}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => onMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-16 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-12 px-4 border-b border-border dark:border-border-dark bg-surface/90 dark:bg-surface-dark/90 backdrop-blur shrink-0">
          <button
            type="button"
            onClick={() => onMobileMenuOpen(true)}
            className="btn-ghost p-2 -ml-2"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-bold text-ink-primary dark:text-ink-dark-primary tracking-tight">KiteView</span>
        </header>

        <MarketTicker sidebarExpanded={sidebarExpanded} />

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 flex flex-col items-center overflow-y-auto overflow-x-hidden min-w-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
