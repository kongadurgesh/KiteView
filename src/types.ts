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

export interface Transaction {
  id: string;
  symbol: string;
  stockName: string;
  type: 'BUY' | 'SELL';
  qty: number;
  price: number;
  date: string;
  createdAt: number;
}

export interface Position {
  symbol: string;
  stockName: string;
  avgBuyPrice: number;
  totalQty: number;
  investedAmount: number;
  realizedPnl: number;
  transactions: Transaction[];
}

export interface Portfolio {
  positions: Record<string, Position>;
}
