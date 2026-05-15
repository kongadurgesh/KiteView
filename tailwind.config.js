/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          dark: '#0f1419',
          'dark-muted': '#111827',
        },
        border: {
          DEFAULT: '#e5e7eb',
          dark: '#1f2937',
        },
        ink: {
          primary: '#111827',
          secondary: '#4b5563',
          muted: '#9ca3af',
          'dark-primary': '#f3f4f6',
          'dark-secondary': '#9ca3af',
          'dark-muted': '#6b7280',
        },
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          muted: '#dbeafe',
          'dark-muted': 'rgba(37, 99, 235, 0.15)',
        },
        positive: {
          DEFAULT: '#059669',
          muted: '#d1fae5',
          dark: '#34d399',
        },
        negative: {
          DEFAULT: '#dc2626',
          muted: '#fee2e2',
          dark: '#f87171',
        },
        warning: {
          DEFAULT: '#d97706',
          muted: '#fef3c7',
          dark: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
};
