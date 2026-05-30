import { createTheme } from '@mui/material/styles';

type AppMode = 'light' | 'dark';

export function createAppTheme(mode: AppMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#2563eb',
        dark: '#1d4ed8',
        light: '#60a5fa',
      },
      secondary: {
        main: '#0f766e',
      },
      success: {
        main: '#16a34a',
      },
      error: {
        main: '#dc2626',
      },
      warning: {
        main: '#d97706',
      },
      background: {
        default: isDark ? '#0b1220' : '#f4f6fb',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e5e7eb' : '#111827',
        secondary: isDark ? '#9ca3af' : '#4b5563',
      },
      divider: isDark ? '#1f2937' : '#e5e7eb',
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 650,
        letterSpacing: '-0.02em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    transitions: {
      duration: {
        shortest: 120,
        shorter: 180,
        short: 220,
        standard: 280,
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  });
}
