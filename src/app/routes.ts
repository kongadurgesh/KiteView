import type { Page } from '../components/layout/types';

/** URL path for each app page (overview is `/`). */
export const PAGE_PATHS: Record<Page, string> = {
  overview: '/',
  screener: '/screener',
  heatmap: '/heatmap',
  lookup: '/lookup',
  compare: '/compare',
  portfolio: '/portfolio',
  about: '/about',
};

const PATH_TO_PAGE = new Map<string, Page>(
  Object.entries(PAGE_PATHS).map(([page, path]) => [path, page as Page]),
);

export function pageToPath(page: Page): string {
  return PAGE_PATHS[page];
}

export function pathToPage(pathname: string): Page {
  const normalized = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
  return PATH_TO_PAGE.get(normalized) ?? 'overview';
}

export function lookupPath(symbol: string): string {
  return `${PAGE_PATHS.lookup}?symbol=${encodeURIComponent(symbol)}`;
}

export function comparePath(symbol: string): string {
  return `${PAGE_PATHS.compare}?symbol=${encodeURIComponent(symbol)}`;
}
