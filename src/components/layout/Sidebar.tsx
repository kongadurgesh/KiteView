import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import StarOutlineOutlinedIcon from '@mui/icons-material/StarOutlineOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { pageToPath } from '../../app/routes';
import type { Page } from './types';

export type { Page } from './types';

interface SidebarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onExpandChange?: (expanded: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: JSX.Element }[] = [
  { id: 'overview', label: 'Overview', icon: <HomeOutlinedIcon fontSize="small" /> },
  { id: 'screener', label: 'Screener', icon: <QueryStatsOutlinedIcon fontSize="small" /> },
  { id: 'heatmap', label: 'Heatmap', icon: <GridViewOutlinedIcon fontSize="small" /> },
  { id: 'indices', label: 'Indices', icon: <PublicOutlinedIcon fontSize="small" /> },
  { id: 'analysis', label: 'Analysis', icon: <SearchOutlinedIcon fontSize="small" /> },
  { id: 'compare', label: 'Compare', icon: <CompareArrowsOutlinedIcon fontSize="small" /> },
  { id: 'watchlist', label: 'Watchlist', icon: <StarOutlineOutlinedIcon fontSize="small" /> },
  { id: 'portfolio', label: 'Portfolio', icon: <WorkOutlineOutlinedIcon fontSize="small" /> },
];

export function Sidebar({
  isDark,
  onToggleTheme,
  onExpandChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [expanded, setExpanded] = useState(false);
  const showLabels = !isDesktop || expanded;
  const drawerWidth = showLabels ? 240 : 72;

  const handleExpand = (val: boolean) => {
    setExpanded(val);
    onExpandChange?.(val);
  };

  const renderNav = () => (
    <Box
      onMouseEnter={() => isDesktop && handleExpand(true)}
      onMouseLeave={() => isDesktop && handleExpand(false)}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <List sx={{ flex: 1, px: 1, py: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={pageToPath(item.id)}
            end={item.id === 'overview'}
            onClick={onMobileClose}
            style={{ textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  minHeight: 42,
                  justifyContent: showLabels ? 'initial' : 'center',
                  px: showLabels ? 1.25 : 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: '#fff' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: showLabels ? 32 : 0,
                    mr: showLabels ? 1 : 0,
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {showLabels && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />}
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </List>

      <Box sx={{ borderTop: 1, borderColor: 'divider', px: 1, py: 1 }}>
        <NavLink
          to={pageToPath('about')}
          onClick={onMobileClose}
          style={{ textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <ListItemButton
              selected={isActive}
              sx={{
                borderRadius: 2,
                minHeight: 42,
                mb: 0.5,
                justifyContent: showLabels ? 'initial' : 'center',
                px: showLabels ? 1.25 : 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: '#fff' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: showLabels ? 32 : 0,
                  mr: showLabels ? 1 : 0,
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <PersonOutlineOutlinedIcon fontSize="small" />
              </ListItemIcon>
              {showLabels && <ListItemText primary="About" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />}
            </ListItemButton>
          )}
        </NavLink>

        <IconButton
          onClick={onToggleTheme}
          sx={{
            mt: 0.5,
            width: '100%',
            borderRadius: 2,
            height: 42,
            justifyContent: showLabels ? 'flex-start' : 'center',
            px: showLabels ? 1.25 : 0,
            color: isDark ? 'warning.main' : 'primary.main',
            gap: showLabels ? 1 : 0,
          }}
        >
          {isDark ? <WbSunnyOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          {showLabels && (
            <Box component="span" sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>
              {isDark ? 'Light mode' : 'Dark mode'}
            </Box>
          )}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {renderNav()}
      </Drawer>

      <Drawer
        open
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.shorter,
            }),
          },
        }}
      >
        {renderNav()}
      </Drawer>
    </>
  );
}

