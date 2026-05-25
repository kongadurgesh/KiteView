/**
 * Heatmap index definitions — shared with frontend via matching ids in heatmapIndices.ts
 * @typedef {{ type: 'slice', start: number, end: number }} SliceSource
 * @typedef {{ type: 'components', symbol: string, fallbackSlice?: [number, number] }} ComponentsSource
 * @typedef {{ type: 'screener', region: string, sector?: string, limit: number, nsOnly?: boolean }} ScreenerSource
 * @typedef {{ id: string, label: string, group: 'indian' | 'global', source: SliceSource | ComponentsSource | ScreenerSource }} HeatmapIndexDef
 */

/** @type {HeatmapIndexDef[]} */
export const HEATMAP_INDEX_DEFS = [
  // Indian — cap-ranked NSE slices
  { id: 'nifty50', label: 'Nifty 50', group: 'indian', source: { type: 'components', symbol: '^NSEI', fallbackSlice: [0, 50] } },
  { id: 'sensex', label: 'Sensex 30', group: 'indian', source: { type: 'slice', start: 0, end: 30 } },
  { id: 'niftynext50', label: 'Nifty Next 50', group: 'indian', source: { type: 'slice', start: 50, end: 100 } },
  { id: 'nifty100', label: 'Nifty 100', group: 'indian', source: { type: 'slice', start: 0, end: 100 } },
  { id: 'nifty200', label: 'Nifty 200', group: 'indian', source: { type: 'slice', start: 0, end: 200 } },
  { id: 'midcap50', label: 'Nifty Midcap 50', group: 'indian', source: { type: 'slice', start: 100, end: 150 } },
  { id: 'niftymidcap100', label: 'Nifty Midcap 100', group: 'indian', source: { type: 'slice', start: 100, end: 200 } },
  { id: 'nifty500', label: 'Nifty 500', group: 'indian', source: { type: 'slice', start: 0, end: 500 } },
  { id: 'smallcap', label: 'Nifty Smallcap 100', group: 'indian', source: { type: 'slice', start: 200, end: 300 } },
  { id: 'niftysmallcap100', label: 'Nifty Smallcap 100', group: 'indian', source: { type: 'slice', start: 200, end: 300 } },
  { id: 'all', label: 'All NSE Stocks', group: 'indian', source: { type: 'slice', start: 0, end: Infinity } },

  // Indian — sector / thematic (Yahoo India screener)
  { id: 'banknifty', label: 'Bank Nifty', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Financial Services', limit: 15, nsOnly: true } },
  { id: 'niftyit', label: 'Nifty IT', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Technology', limit: 20, nsOnly: true } },
  { id: 'niftyauto', label: 'Nifty Auto', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Consumer Cyclical', limit: 40, nsOnly: true } },
  { id: 'niftyfmcg', label: 'Nifty FMCG', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Consumer Defensive', limit: 40, nsOnly: true } },
  { id: 'niftymetal', label: 'Nifty Metal', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Basic Materials', limit: 40, nsOnly: true } },
  { id: 'niftyenergy', label: 'Nifty Energy', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Energy', limit: 40, nsOnly: true } },
  { id: 'niftyrealty', label: 'Nifty Realty', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Real Estate', limit: 30, nsOnly: true } },
  { id: 'niftypharma', label: 'Nifty Pharma', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Healthcare', limit: 40, nsOnly: true } },
  { id: 'niftypsu', label: 'Nifty PSU Bank', group: 'indian', source: { type: 'screener', region: 'in', sector: 'Financial Services', limit: 12, nsOnly: true } },

  // Global — Yahoo components or regional screener
  { id: 'sp500', label: 'S&P 500', group: 'global', source: { type: 'screener', region: 'us', limit: 500 } },
  { id: 'dow', label: 'Dow Jones', group: 'global', source: { type: 'components', symbol: '^DJI' } },
  { id: 'nasdaq', label: 'Nasdaq 100', group: 'global', source: { type: 'components', symbol: '^NDX' } },
  { id: 'russell', label: 'Russell 2000', group: 'global', source: { type: 'screener', region: 'us', limit: 200 } },
  { id: 'ftse', label: 'FTSE 100', group: 'global', source: { type: 'components', symbol: '^FTSE' } },
  { id: 'dax', label: 'DAX', group: 'global', source: { type: 'components', symbol: '^GDAXI' } },
  { id: 'cac', label: 'CAC 40', group: 'global', source: { type: 'components', symbol: '^FCHI' } },
  { id: 'nikkei', label: 'Nikkei 225', group: 'global', source: { type: 'screener', region: 'jp', limit: 225 } },
  { id: 'hangseng', label: 'Hang Seng', group: 'global', source: { type: 'components', symbol: '^HSI' } },
  { id: 'kospi', label: 'KOSPI', group: 'global', source: { type: 'screener', region: 'kr', limit: 80 } },
  { id: 'asx', label: 'ASX 200', group: 'global', source: { type: 'components', symbol: '^AXJO' } },
];

const BY_ID = new Map(HEATMAP_INDEX_DEFS.map((d) => [d.id, d]));

export function getHeatmapIndexDef(id) {
  return BY_ID.get(id);
}

export function isHeatmapIndexId(id) {
  return BY_ID.has(id);
}
