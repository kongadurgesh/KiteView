import { Candle, PatternMatch, PatternName } from '../types';
import { calculateBuyPrice, calculateBuyTriggerPrice } from './buyPrice';

/** Same floor as screener universe (market cap > ₹1,000 Cr). */
const MIN_MARKET_CAP_CR = 1000;

function isRedCandle(c: Candle): boolean {
  return c.close < c.open;
}

function isGreenCandle(c: Candle): boolean {
  return c.close > c.open;
}

// --- Bullish Harami ---

function isHaramiCandle(c1: Candle, c2: Candle): boolean {
  return (
    c2.high < c1.high &&
    c2.low > c1.low &&
    c2.open >= c1.close &&
    c2.close <= c1.open &&
    isGreenCandle(c2)
  );
}

function isHaramiBreakout(c1: Candle, c2: Candle, c3: Candle): boolean {
  return (
    c3.high > c2.high &&
    c3.high > c1.high &&
    c3.low > c2.low &&
    isGreenCandle(c3) &&
    c3.close > c2.close &&
    c3.close > c1.close &&
    c3.close > c1.open
  );
}

// --- Bullish Engulfing ---

function isEngulfingCandle(c1: Candle, c2: Candle): boolean {
  return (
    c2.close > c1.open &&
    c2.open < c1.close &&
    c2.high > c1.high &&
    c2.low < c1.low
  );
}

function isEngulfingBreakout(c1: Candle, c2: Candle, c3: Candle): boolean {
  return (
    c3.low > c1.low &&
    c3.low > c2.low &&
    c3.high > c2.high &&
    c3.close > c2.close &&
    isGreenCandle(c3)
  );
}

// --- Shared filters ---

function passesFilters(c3: Candle): boolean {
  if (c3.volume <= 200000) return false;
  if (c3.close <= 50) return false;
  return true;
}

function buildMatch(
  patternName: PatternName,
  c1: Candle,
  c2: Candle,
  c3: Candle
): PatternMatch {
  return {
    patternName,
    candle1: c1,
    candle2: c2,
    candle3: c3,
    buyPrice: calculateBuyPrice(c3.close),
    buyTriggerPrice: calculateBuyTriggerPrice(c3.close),
  };
}

function tryMatchAt(i: number, candles: Candle[]): PatternMatch | null {
  const c1 = candles[i];
  const c2 = candles[i + 1];
  const c3 = candles[i + 2];
  if (!isRedCandle(c1) || !passesFilters(c3)) return null;
  if (isHaramiCandle(c1, c2) && isHaramiBreakout(c1, c2, c3)) {
    return buildMatch('Bullish Harami', c1, c2, c3);
  }
  if (isEngulfingCandle(c1, c2) && isEngulfingBreakout(c1, c2, c3)) {
    return buildMatch('Bullish Engulfing', c1, c2, c3);
  }
  return null;
}

export function detectPattern(candles: Candle[], marketCapCr: number): PatternMatch | null {
  if (marketCapCr > 0 && marketCapCr < MIN_MARKET_CAP_CR) return null;
  for (let i = candles.length - 3; i >= 0; i--) {
    const m = tryMatchAt(i, candles);
    if (m) return m;
  }
  return null;
}

/** Most recent pattern whose breakout bar (candle3) falls in [fromDate, toDate] inclusive. */
export function detectPatternInRange(
  candles: Candle[],
  marketCapCr: number,
  fromDate: string,
  toDate: string,
): PatternMatch | null {
  if (marketCapCr > 0 && marketCapCr < MIN_MARKET_CAP_CR) return null;
  for (let i = candles.length - 3; i >= 0; i--) {
    const m = tryMatchAt(i, candles);
    if (!m) continue;
    const d = m.candle3.date;
    if (d >= fromDate && d <= toDate) return m;
  }
  return null;
}
