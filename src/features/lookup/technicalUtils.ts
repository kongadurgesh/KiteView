import type { Candle } from '../../types';

export interface TechnicalSummary {
  pctFrom52WeekHigh: number | null;
  pctFrom52WeekLow: number | null;
  rangePositionPct: number | null;
  sma50: number | null;
  aboveSma50: boolean | null;
  rsi14: number | null;
  trendLabel: string;
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function buildTechnicalSummary(
  candles: Candle[],
  currentPrice: number,
  fiftyTwoWeekHigh: number,
  fiftyTwoWeekLow: number,
): TechnicalSummary {
  const closes = candles.map((c) => c.close).filter((c) => c > 0);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes, 14);

  let pctFrom52WeekHigh: number | null = null;
  let pctFrom52WeekLow: number | null = null;
  let rangePositionPct: number | null = null;

  if (currentPrice > 0 && fiftyTwoWeekHigh > 0) {
    pctFrom52WeekHigh = ((currentPrice / fiftyTwoWeekHigh) - 1) * 100;
  }
  if (currentPrice > 0 && fiftyTwoWeekLow > 0) {
    pctFrom52WeekLow = ((currentPrice / fiftyTwoWeekLow) - 1) * 100;
  }
  if (fiftyTwoWeekHigh > fiftyTwoWeekLow && currentPrice > 0) {
    rangePositionPct =
      ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100;
  }

  let aboveSma50: boolean | null = null;
  if (sma50 != null && currentPrice > 0) aboveSma50 = currentPrice > sma50;

  let trendLabel = 'Insufficient data';
  if (aboveSma50 === true && rsi14 != null && rsi14 >= 45) trendLabel = 'Bullish bias';
  else if (aboveSma50 === false && rsi14 != null && rsi14 <= 55) trendLabel = 'Bearish bias';
  else if (aboveSma50 != null) trendLabel = aboveSma50 ? 'Above 50-day average' : 'Below 50-day average';

  return {
    pctFrom52WeekHigh,
    pctFrom52WeekLow,
    rangePositionPct,
    sma50,
    aboveSma50,
    rsi14,
    trendLabel,
  };
}

export function candlesToChartSeries(candles: Candle[]): { date: string; close: number }[] {
  return candles.map((c) => ({ date: c.date, close: c.close }));
}
