import { getTradeSignal } from '../../lib/tradeSignal';
import type { PatternMatch } from '../../types';
import type { StockStats } from '../../types/stockStats';
import type { QuoteSnapshot } from './quoteSnapshot';
import { getCapCategory } from '../../lib/marketCap';

export interface SwotBullet {
  text: string;
}

export interface SwotAnalysis {
  strengths: SwotBullet[];
  weaknesses: SwotBullet[];
  opportunities: SwotBullet[];
  threats: SwotBullet[];
}

export interface SwotInput {
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCapCr: number;
  stockStats: StockStats | null;
  quoteSnapshot: QuoteSnapshot | null;
  match: PatternMatch | null;
  rsi14: number | null;
  aboveSma50: boolean | null;
}

function pct52wChange(stats: StockStats | null): number | null {
  if (!stats?.fiftyTwoWeekChange) return null;
  const v = stats.fiftyTwoWeekChange;
  return Math.abs(v) <= 1 ? v * 100 : v;
}

export function buildSwotAnalysis(input: SwotInput): SwotAnalysis {
  const {
    currentPrice,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    marketCapCr,
    stockStats,
    quoteSnapshot,
    match,
    rsi14,
    aboveSma50,
  } = input;

  const strengths: SwotBullet[] = [];
  const weaknesses: SwotBullet[] = [];
  const opportunities: SwotBullet[] = [];
  const threats: SwotBullet[] = [];

  const ch52 = pct52wChange(stockStats);
  if (ch52 != null && ch52 > 10) strengths.push({ text: `Strong 52-week momentum (+${ch52.toFixed(1)}%)` });
  if (ch52 != null && ch52 < -15) weaknesses.push({ text: `Weak 52-week performance (${ch52.toFixed(1)}%)` });

  if (currentPrice > 0 && fiftyTwoWeekHigh > 0) {
    const belowHigh = ((1 - currentPrice / fiftyTwoWeekHigh) * 100);
    if (belowHigh <= 5) strengths.push({ text: 'Trading within 5% of 52-week high' });
    if (belowHigh > 25) weaknesses.push({ text: `Price is ${belowHigh.toFixed(0)}% below 52-week high` });
  }

  if (currentPrice > 0 && fiftyTwoWeekLow > 0) {
    const aboveLow = ((currentPrice / fiftyTwoWeekLow) - 1) * 100;
    if (fiftyTwoWeekHigh > fiftyTwoWeekLow) {
      const pos = ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100;
      if (pos < 40) opportunities.push({ text: 'Price in lower half of 52-week range — potential value zone' });
      if (pos > 85) threats.push({ text: 'Price near top of 52-week range — limited upside room' });
    }
    if (aboveLow > 30 && ch52 != null && ch52 > 20) threats.push({ text: 'Extended rally from 52-week lows' });
  }

  if (stockStats?.pe != null && stockStats.pe > 0 && stockStats.pe < 25) {
    strengths.push({ text: `Reasonable trailing P/E (${stockStats.pe.toFixed(1)})` });
  }
  if (stockStats?.pe != null && stockStats.pe > 40) {
    weaknesses.push({ text: `Elevated trailing P/E (${stockStats.pe.toFixed(1)})` });
  }

  if (
    stockStats?.forwardPE != null &&
    stockStats?.pe != null &&
    stockStats.forwardPE > 0 &&
    stockStats.pe > 0 &&
    stockStats.forwardPE < stockStats.pe * 0.85
  ) {
    opportunities.push({ text: 'Forward P/E below trailing — earnings growth expected' });
  }

  if (stockStats?.beta != null && stockStats.beta < 1) {
    strengths.push({ text: `Lower volatility vs market (beta ${stockStats.beta.toFixed(2)})` });
  }
  if (stockStats?.beta != null && stockStats.beta > 1.3) {
    threats.push({ text: `High beta (${stockStats.beta.toFixed(2)}) — sensitive to market swings` });
  }

  if (stockStats?.pb != null && stockStats.pb > 5) {
    weaknesses.push({ text: `High price-to-book (${stockStats.pb.toFixed(2)})` });
  }

  const cap = getCapCategory(marketCapCr);
  if (cap === 'Large Cap') strengths.push({ text: 'Large-cap liquidity and stability' });
  if (cap === 'Small Cap') threats.push({ text: 'Small-cap — higher volatility and liquidity risk' });

  if (match) {
    strengths.push({ text: 'Breakout pattern detected' });
  } else {
    weaknesses.push({ text: 'No breakout pattern in the last year' });
  }

  if (match && currentPrice > 0) {
    const sig = getTradeSignal(currentPrice, match.buyPrice);
    if (sig === 'WAIT') {
      threats.push({ text: 'WAIT — CMP more than 2% above buy price' });
    } else {
      opportunities.push({ text: 'BUY signal — CMP within 2% of buy price' });
    }
  }

  if (aboveSma50 === true) strengths.push({ text: 'Price above 50-day moving average' });
  if (aboveSma50 === false) weaknesses.push({ text: 'Price below 50-day moving average' });

  if (rsi14 != null && rsi14 >= 55 && rsi14 < 70) strengths.push({ text: `RSI ${rsi14.toFixed(0)} — positive momentum` });
  if (rsi14 != null && rsi14 > 70) threats.push({ text: `RSI ${rsi14.toFixed(0)} — overbought territory` });
  if (rsi14 != null && rsi14 < 35) opportunities.push({ text: `RSI ${rsi14.toFixed(0)} — potentially oversold` });

  const dayCh = quoteSnapshot?.changePercent;
  if (dayCh != null) {
    const d = Math.abs(dayCh) <= 1 ? dayCh * 100 : dayCh;
    if (d > 2) strengths.push({ text: `Positive session (+${d.toFixed(2)}%)` });
    if (d < -2) threats.push({ text: `Weak session (${d.toFixed(2)}%)` });
  }

  const ensure = (arr: SwotBullet[], fallback: string) =>
    arr.length > 0 ? arr : [{ text: fallback }];

  return {
    strengths: ensure(strengths, 'No standout strengths from current data'),
    weaknesses: ensure(weaknesses, 'No major weaknesses flagged'),
    opportunities: ensure(opportunities, 'No clear opportunities identified'),
    threats: ensure(threats, 'No major threats flagged'),
  };
}
