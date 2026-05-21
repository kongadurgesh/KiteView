import type { StockStats } from '../../types/stockStats';
import type { TechnicalSummary } from './technicalUtils';

export interface DvmScores {
  durability: number;
  valuation: number;
  momentum: number;
}

function pct52w(stats: StockStats | null): number | null {
  if (stats?.fiftyTwoWeekChange == null) return null;
  const v = stats.fiftyTwoWeekChange;
  return Math.abs(v) <= 1 ? v * 100 : v;
}

export function buildDvmScores(
  stockStats: StockStats | null,
  currentPrice: number,
  fiftyTwoWeekHigh: number,
  fiftyTwoWeekLow: number,
  technical: TechnicalSummary,
): DvmScores {
  let durability = 50;
  let valuation = 50;
  let momentum = 50;

  if (stockStats?.beta != null) {
    if (stockStats.beta < 0.9) durability += 15;
    else if (stockStats.beta > 1.3) durability -= 15;
  }
  if (stockStats?.marketCap != null && stockStats.marketCap > 50_000_000_000) durability += 10;

  if (stockStats?.pe != null && stockStats.pe > 0) {
    if (stockStats.pe < 18) valuation += 20;
    else if (stockStats.pe < 28) valuation += 10;
    else if (stockStats.pe > 40) valuation -= 20;
  }
  if (stockStats?.pb != null && stockStats.pb > 0) {
    if (stockStats.pb < 2) valuation += 10;
    else if (stockStats.pb > 5) valuation -= 15;
  }

  const ch52 = pct52w(stockStats);
  if (ch52 != null) {
    if (ch52 > 15) momentum += 25;
    else if (ch52 > 5) momentum += 15;
    else if (ch52 < -10) momentum -= 25;
  }
  if (technical.aboveSma50 === true) momentum += 10;
  if (technical.aboveSma50 === false) momentum -= 10;
  if (technical.rsi14 != null) {
    if (technical.rsi14 >= 50 && technical.rsi14 < 65) momentum += 10;
    if (technical.rsi14 < 40) momentum -= 5;
  }
  if (currentPrice > 0 && fiftyTwoWeekHigh > fiftyTwoWeekLow) {
    const pos = ((currentPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100;
    if (pos > 70) momentum += 5;
    if (pos < 30) momentum -= 5;
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    durability: clamp(durability),
    valuation: clamp(valuation),
    momentum: clamp(momentum),
  };
}
