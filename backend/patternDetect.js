/** Shared pattern detection for screener-scan (mirrors src/utils/patternDetector.ts). */

/** Same floor as screener universe (market cap > ₹1,000 Cr). */
const MIN_MARKET_CAP_CR = 1000;

function isRedCandle(c) { return c.close < c.open; }
function isGreenCandle(c) { return c.close > c.open; }
function isHaramiCandle(c1, c2) {
  return c2.high < c1.high && c2.low > c1.low && c2.open >= c1.close && c2.close <= c1.open && isGreenCandle(c2);
}
function isHaramiBreakout(c1, c2, c3) {
  return c3.high > c2.high && c3.high > c1.high && c3.low > c2.low && isGreenCandle(c3) && c3.close > c2.close && c3.close > c1.close && c3.close > c1.open;
}
function isEngulfingCandle(c1, c2) {
  return c2.close > c1.open && c2.open < c1.close && c2.high > c1.high && c2.low < c1.low;
}
function isEngulfingBreakout(c1, c2, c3) {
  return c3.low > c1.low && c3.low > c2.low && c3.high > c2.high && c3.close > c2.close && isGreenCandle(c3);
}

function buildMatch(patternName, c1, c2, c3) {
  return {
    patternName,
    candle1: c1,
    candle2: c2,
    candle3: c3,
    buyPrice: parseFloat((0.98 * c3.close).toFixed(2)),
    buyTriggerPrice: parseFloat((0.985 * c3.close).toFixed(2)),
  };
}

function isPatternAllowed(patternName, allowedPatternNames) {
  if (!allowedPatternNames || allowedPatternNames.length === 0) return true;
  return allowedPatternNames.includes(patternName);
}

function tryMatchAt(i, candles, allowedPatternNames) {
  const c1 = candles[i];
  const c2 = candles[i + 1];
  const c3 = candles[i + 2];
  if (!isRedCandle(c1) || c3.volume <= 200000 || c3.close <= 50) return null;
  if (isHaramiCandle(c1, c2) && isHaramiBreakout(c1, c2, c3) && isPatternAllowed('Bullish Harami', allowedPatternNames)) {
    return buildMatch('Bullish Harami', c1, c2, c3);
  }
  if (isEngulfingCandle(c1, c2) && isEngulfingBreakout(c1, c2, c3) && isPatternAllowed('Bullish Engulfing', allowedPatternNames)) {
    return buildMatch('Bullish Engulfing', c1, c2, c3);
  }
  return null;
}

export function detectPattern(candles, marketCapCr, allowedPatternNames = []) {
  if (marketCapCr > 0 && marketCapCr < MIN_MARKET_CAP_CR) return null;
  for (let i = candles.length - 3; i >= 0; i--) {
    const m = tryMatchAt(i, candles, allowedPatternNames);
    if (m) return m;
  }
  return null;
}

/** Most recent pattern (walk from end) whose breakout bar is in [fromDate, toDate]. */
export function detectPatternInRange(candles, marketCapCr, fromDate, toDate, allowedPatternNames = []) {
  if (marketCapCr > 0 && marketCapCr < MIN_MARKET_CAP_CR) return null;
  for (let i = candles.length - 3; i >= 0; i--) {
    const m = tryMatchAt(i, candles, allowedPatternNames);
    if (!m) continue;
    const d = m.candle3.date;
    if (d >= fromDate && d <= toDate) return m;
  }
  return null;
}
