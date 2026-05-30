import type { TradeSignal } from '../lib/tradeSignal';

export interface WatchlistThesis {
  note: string;
  targetPrice: number | null;
  stopPrice: number | null;
  entryBuyPrice: number | null;
  patternDate: string | null;
}

export interface WatchlistAlerts {
  buyWindow: boolean;
  swotFlip: boolean;
  patternToday: boolean;
}

export interface WatchlistItem {
  symbol: string;
  shortName: string;
  addedAt: string;
  thesis: WatchlistThesis;
  alerts: WatchlistAlerts;
}

export interface Watchlist {
  id: string;
  name: string;
  createdAt: string;
  items: WatchlistItem[];
}

export interface WatchlistSnapshot {
  symbol: string;
  shortName: string;
  currentPrice: number;
  changePercent: number | null;
  signal: TradeSignal;
  buyPrice: number | null;
  patternName: string | null;
  patternDate: string | null;
  patternToday: boolean;
  swotStrengths: number | null;
  swotWeaknesses: number | null;
  swotOpportunities: number | null;
  swotThreats: number | null;
  swotHealthy: boolean;
}

export const DEFAULT_ALERTS: WatchlistAlerts = {
  buyWindow: true,
  swotFlip: true,
  patternToday: true,
};

export const EMPTY_THESIS: WatchlistThesis = {
  note: '',
  targetPrice: null,
  stopPrice: null,
  entryBuyPrice: null,
  patternDate: null,
};
