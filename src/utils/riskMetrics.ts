export function dailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return mean(arr.map((v) => (v - m) ** 2));
}

function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const mA = mean(a.slice(0, n));
  const mB = mean(b.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (a[i] - mA) * (b[i] - mB);
  }
  return sum / n;
}

export function computeBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  const v = variance(benchmarkReturns);
  if (v === 0) return 0;
  return parseFloat((covariance(portfolioReturns, benchmarkReturns) / v).toFixed(2));
}

export function computeMaxDrawdown(values: number[]): { maxDrawdown: number; peakDate: number; troughDate: number } {
  let peak = values[0];
  let peakIdx = 0;
  let maxDd = 0;
  let ddPeakIdx = 0;
  let ddTroughIdx = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      peakIdx = i;
    }
    const dd = (peak - values[i]) / peak;
    if (dd > maxDd) {
      maxDd = dd;
      ddPeakIdx = peakIdx;
      ddTroughIdx = i;
    }
  }

  return {
    maxDrawdown: parseFloat((maxDd * 100).toFixed(2)),
    peakDate: ddPeakIdx,
    troughDate: ddTroughIdx,
  };
}

export function computeVolatility(returns: number[]): number {
  return parseFloat((stdDev(returns) * Math.sqrt(252) * 100).toFixed(2));
}

export function computeSharpeRatio(returns: number[], riskFreeRate: number = 0.065): number {
  if (returns.length === 0) return 0;
  const annualizedReturn = mean(returns) * 252;
  const vol = stdDev(returns) * Math.sqrt(252);
  if (vol === 0) return 0;
  return parseFloat(((annualizedReturn - riskFreeRate) / vol).toFixed(2));
}

export function computeHHI(weights: number[]): number {
  return weights.reduce((s, w) => s + w * w, 0);
}

export function diversificationScore(weights: number[]): number {
  const hhi = computeHHI(weights);
  return parseFloat(((1 - hhi) * 100).toFixed(1));
}

export function computeCorrelationMatrix(
  returnsBySymbol: Record<string, number[]>,
): { symbols: string[]; matrix: number[][] } {
  const symbols = Object.keys(returnsBySymbol);
  const n = symbols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      const a = returnsBySymbol[symbols[i]];
      const b = returnsBySymbol[symbols[j]];
      const len = Math.min(a.length, b.length);
      if (len < 5) {
        matrix[i][j] = 0;
        continue;
      }
      const cov = covariance(a.slice(0, len), b.slice(0, len));
      const sA = stdDev(a.slice(0, len));
      const sB = stdDev(b.slice(0, len));
      matrix[i][j] = sA && sB ? parseFloat((cov / (sA * sB)).toFixed(2)) : 0;
    }
  }

  return { symbols, matrix };
}

export interface SectorWeight {
  sector: string;
  weight: number;
  amount: number;
}

export function computeSectorConcentration(
  holdings: { symbol: string; value: number }[],
  sectorMap: Record<string, string>,
): SectorWeight[] {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  if (totalValue === 0) return [];

  const byKey: Record<string, number> = {};
  for (const h of holdings) {
    const sector = sectorMap[h.symbol] || 'Unknown';
    byKey[sector] = (byKey[sector] ?? 0) + h.value;
  }

  return Object.entries(byKey)
    .map(([sector, amount]) => ({
      sector,
      weight: parseFloat((amount / totalValue).toFixed(4)),
      amount,
    }))
    .sort((a, b) => b.weight - a.weight);
}
