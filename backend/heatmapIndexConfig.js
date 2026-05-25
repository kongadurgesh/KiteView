/**
 * Heatmap index definitions — shared with frontend via matching ids in heatmapIndices.ts
 * @typedef {{ type: 'slice', start: number, end: number }} SliceSource
 * @typedef {{ type: 'bundled' }} BundledSource
 * @typedef {{ type: 'proxy', region: string, limit: number }} ProxySource
 * @typedef {{ id: string, label: string, group: 'indian' | 'global', source: SliceSource | BundledSource | ProxySource }} HeatmapIndexDef
 */

/** @type {HeatmapIndexDef[]} */
export const HEATMAP_INDEX_DEFS = [
  // Indian — cap-ranked NSE slices (client-side from screener list)
  { id: 'nifty50', label: 'Nifty 50', group: 'indian', source: { type: 'bundled' } },
  { id: 'sensex', label: 'Sensex 30', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftynext50', label: 'Nifty Next 50', group: 'indian', source: { type: 'bundled' } },
  { id: 'nifty100', label: 'Nifty 100', group: 'indian', source: { type: 'bundled' } },
  { id: 'nifty200', label: 'Nifty 200', group: 'indian', source: { type: 'bundled' } },
  { id: 'midcap50', label: 'Nifty Midcap 50', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftymidcap100', label: 'Nifty Midcap 100', group: 'indian', source: { type: 'bundled' } },
  { id: 'nifty500', label: 'Nifty 500', group: 'indian', source: { type: 'bundled' } },
  { id: 'smallcap', label: 'Nifty Smallcap 100', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftysmallcap100', label: 'Nifty Smallcap 100', group: 'indian', source: { type: 'bundled' } },
  { id: 'all', label: 'All NSE Stocks', group: 'indian', source: { type: 'slice', start: 0, end: Infinity } },

  // Indian — sector / thematic (official Nifty Indices CSV)
  { id: 'banknifty', label: 'Bank Nifty', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyit', label: 'Nifty IT', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyauto', label: 'Nifty Auto', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyfmcg', label: 'Nifty FMCG', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftymetal', label: 'Nifty Metal', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyenergy', label: 'Nifty Energy', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyrealty', label: 'Nifty Realty', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftypharma', label: 'Nifty Pharma', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftypsu', label: 'Nifty PSU Bank', group: 'indian', source: { type: 'bundled' } },

  // Global — bundled authoritative lists (+ Yahoo quotes only)
  { id: 'sp500', label: 'S&P 500', group: 'global', source: { type: 'bundled' } },
  { id: 'dow', label: 'Dow Jones', group: 'global', source: { type: 'bundled' } },
  { id: 'nasdaq', label: 'Nasdaq 100', group: 'global', source: { type: 'bundled' } },
  { id: 'ftse', label: 'FTSE 100', group: 'global', source: { type: 'bundled' } },
  { id: 'dax', label: 'DAX', group: 'global', source: { type: 'bundled' } },
  { id: 'cac', label: 'CAC 40', group: 'global', source: { type: 'bundled' } },
  { id: 'asx', label: 'ASX 200', group: 'global', source: { type: 'bundled' } },

  // Approximate — no reliable free full constituent list
  { id: 'nikkei', label: 'Nikkei 225 (approx)', group: 'global', source: { type: 'proxy', region: 'jp', limit: 225 } },
  { id: 'hangseng', label: 'Hang Seng (approx)', group: 'global', source: { type: 'proxy', region: 'hk', limit: 82 } },
  { id: 'russell', label: 'Russell 2000 (approx)', group: 'global', source: { type: 'proxy', region: 'us', limit: 200 } },
  { id: 'kospi', label: 'KOSPI (approx)', group: 'global', source: { type: 'proxy', region: 'kr', limit: 80 } },
];

const BY_ID = new Map(HEATMAP_INDEX_DEFS.map((d) => [d.id, d]));

export function getHeatmapIndexDef(id) {
  return BY_ID.get(id);
}

export function isHeatmapIndexId(id) {
  return BY_ID.has(id);
}
