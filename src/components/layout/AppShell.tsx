import { ReactNode, type Ref } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
  sidebarExpanded: _sidebarExpanded,
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

  const appBarLeft = 72;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onExpandChange={onSidebarExpandChange}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => onMobileMenuOpen(false)}
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: { xs: 0, lg: `${appBarLeft}px` },
            zIndex: (theme) => theme.zIndex.drawer - 1,
          }}
        >
          <AppBar
            position="static"
            color="transparent"
            elevation={0}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(10px)',
              bgcolor: 'rgba(15, 23, 42, 0.06)',
            }}
          >
            <Toolbar sx={{ minHeight: 52, px: { xs: 1.5, sm: 2 } }}>
              <IconButton
                edge="start"
                onClick={() => onMobileMenuOpen(true)}
                sx={{ display: { lg: 'none' }, mr: 1 }}
                aria-label="Open menu"
              >
                <MenuIcon />
              </IconButton>

              <Typography
                component={Link}
                to="/"
                sx={{
                  textDecoration: 'none',
                  color: 'text.primary',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontSize: 20,
                }}
              >
                KiteView
              </Typography>

              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                {user ? (
                  <>
                    <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 13, color: 'text.secondary', maxWidth: 220 }} noWrap>
                      Hello, {displayName}
                    </Typography>
                    <Button variant="text" size="small" onClick={() => void signOut()}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" size="small" onClick={openLoginModal}>
                    Login
                  </Button>
                )}
              </Box>
            </Toolbar>
          </AppBar>
          <MarketTicker />
        </Box>

        <Box
          component="main"
          ref={mainScrollRef}
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
            pt: 'calc(3.25rem + 2.5rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarGutter: 'stable',
            width: '100%',
            minWidth: 0,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
