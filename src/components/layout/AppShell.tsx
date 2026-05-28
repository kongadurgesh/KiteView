import { ReactNode, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MarketTicker } from './MarketTicker';
import { useAuth } from '../../auth/AuthContext';
interface AppShellProps {
  isDark: boolean;
  onToggleTheme: () => void;
  sidebarExpanded: boolean;
  onSidebarExpandChange: (expanded: boolean) => void;
  mobileMenuOpen: boolean;
  onMobileMenuOpen: (open: boolean) => void;
  mainScrollRef?: Ref<HTMLElement>;
  children: ReactNode;
}

export function AppShell({
  isDark,
  onToggleTheme,
  sidebarExpanded,
  onSidebarExpandChange,
  mobileMenuOpen,
  onMobileMenuOpen,
  mainScrollRef,
  children,
}: AppShellProps) {
  const { user, signOut, openLoginModal } = useAuth();

  const displayName = (() => {
    if (!user) return '';
    const meta = user.user_metadata as {
      first_name?: string;
      last_name?: string;
      given_name?: string;
      family_name?: string;
      full_name?: string;
      name?: string;
    };

    const first = (meta.first_name ?? meta.given_name ?? '').trim();
    const last = (meta.last_name ?? meta.family_name ?? '').trim();
    if (first || last) return `${first} ${last}`.trim();

    const full = (meta.full_name ?? meta.name ?? '').trim();
    if (full) return full;

    const emailUser = user.email?.split('@')[0]?.trim();
    return emailUser || 'User';
  })();

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
        <div className="fixed top-0 left-0 right-0 lg:left-16 z-30">
          <header className="flex items-center gap-3 h-12 px-4 border-b border-border dark:border-border-dark bg-surface/90 dark:bg-surface-dark/90 backdrop-blur shrink-0">
            <button
              type="button"
              onClick={() => onMobileMenuOpen(true)}
              className="btn-ghost p-2 -ml-2 lg:hidden"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <Link
              to="/"
              className="font-bold text-ink-primary dark:text-ink-dark-primary tracking-tight"
              aria-label="Go to overview"
            >
              KiteView
            </Link>

            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden sm:block text-xs sm:text-sm font-medium text-ink-muted dark:text-ink-dark-muted truncate max-w-[180px]">
                    Hello, {displayName}
                  </span>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="btn-ghost px-3 py-1.5 text-xs sm:text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="btn-primary px-3 py-1.5 text-xs sm:text-sm"
                >
                  Login
                </button>
              )}
            </div>
          </header>

          <MarketTicker sidebarExpanded={sidebarExpanded} />
        </div>

        <main
          ref={mainScrollRef}
          className="flex-1 px-4 pb-4 pt-[calc(3rem+2.5rem)] sm:px-6 sm:pb-6 sm:pt-[calc(3rem+2.5rem)] flex flex-col items-center overflow-y-auto overflow-x-hidden min-w-0 w-full"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
