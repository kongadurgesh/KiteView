export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PatternName = 'Bullish Harami' | 'Bullish Engulfing';

export interface PatternMatch {
  patternName: PatternName;
  candle1: Candle; // Red candle (oldest)
  candle2: Candle; // Middle candle (Harami inside / Engulfing)
  candle3: Candle; // Breakout green candle (newest)
  buyPrice: number;
  buyTriggerPrice: number;
}

export interface StockInfo {
  symbol: string;
  shortName: string;
  marketCap: number; // in crores
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  candles: Candle[];
}
