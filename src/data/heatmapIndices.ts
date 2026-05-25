/** Heatmap index filters — keep in sync with backend/heatmapIndexConfig.js */

export type HeatmapIndexGroup = 'indian' | 'global';

export type HeatmapSource =
  | { type: 'slice'; start: number; end: number }
  | { type: 'bundled' }
  | { type: 'proxy'; region: string; limit: number };

export interface HeatmapIndexOption {
  id: string;
  label: string;
  group: HeatmapIndexGroup;
  source: HeatmapSource;
}

export const HEATMAP_INDICES: HeatmapIndexOption[] = [
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

  { id: 'banknifty', label: 'Bank Nifty', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyit', label: 'Nifty IT', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyauto', label: 'Nifty Auto', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyfmcg', label: 'Nifty FMCG', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftymetal', label: 'Nifty Metal', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyenergy', label: 'Nifty Energy', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftyrealty', label: 'Nifty Realty', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftypharma', label: 'Nifty Pharma', group: 'indian', source: { type: 'bundled' } },
  { id: 'niftypsu', label: 'Nifty PSU Bank', group: 'indian', source: { type: 'bundled' } },

  { id: 'sp500', label: 'S&P 500', group: 'global', source: { type: 'bundled' } },
  { id: 'dow', label: 'Dow Jones', group: 'global', source: { type: 'bundled' } },
  { id: 'nasdaq', label: 'Nasdaq 100', group: 'global', source: { type: 'bundled' } },
  { id: 'ftse', label: 'FTSE 100', group: 'global', source: { type: 'bundled' } },
  { id: 'dax', label: 'DAX', group: 'global', source: { type: 'bundled' } },
  { id: 'cac', label: 'CAC 40', group: 'global', source: { type: 'bundled' } },
  { id: 'asx', label: 'ASX 200', group: 'global', source: { type: 'bundled' } },
  { id: 'nikkei', label: 'Nikkei 225 (approx)', group: 'global', source: { type: 'proxy', region: 'jp', limit: 225 } },
  { id: 'hangseng', label: 'Hang Seng (approx)', group: 'global', source: { type: 'proxy', region: 'hk', limit: 82 } },
  { id: 'russell', label: 'Russell 2000 (approx)', group: 'global', source: { type: 'proxy', region: 'us', limit: 200 } },
  { id: 'kospi', label: 'KOSPI (approx)', group: 'global', source: { type: 'proxy', region: 'kr', limit: 80 } },
];

export type HeatmapIndexId = (typeof HEATMAP_INDICES)[number]['id'];

const HEATMAP_INDEX_IDS = new Set(HEATMAP_INDICES.map((i) => i.id));

export function isHeatmapIndexId(id: string): id is HeatmapIndexId {
  return HEATMAP_INDEX_IDS.has(id);
}

export function getHeatmapIndexOption(id: string): HeatmapIndexOption | undefined {
  return HEATMAP_INDICES.find((i) => i.id === id);
}

export function heatmapIndicesByGroup(group: HeatmapIndexGroup): HeatmapIndexOption[] {
  return HEATMAP_INDICES.filter((i) => i.group === group);
}

export function usesRemoteConstituents(option: HeatmapIndexOption): boolean {
  return option.source.type !== 'slice';
}
