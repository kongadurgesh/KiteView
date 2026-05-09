import { Portfolio, Transaction } from '../types';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

export async function fetchHistoricalPrices(
  symbols: string[],
  range: string = '1y',
): Promise<Record<string, Record<string, number>>> {
  const result: Record<string, Record<string, number>> = {};

  const fetches = symbols.map(async (sym) => {
    try {
      const url = `${PROXY_BASE}/api/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const chart = data?.chart?.result?.[0];
      if (!chart) return;

      const timestamps: number[] = chart.timestamp ?? [];
      const closes: (number | null)[] = chart.indicators?.quote?.[0]?.close ?? [];
      const volumes: (number | null)[] = chart.indicators?.quote?.[0]?.volume ?? [];
      const map: Record<string, number> = {};

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        const v = volumes[i];
        if (c == null || v == null || v === 0) continue;
        const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        map[date] = parseFloat(c.toFixed(2));
      }
      result[sym] = map;
    } catch {
      // skip failed symbols silently
    }
  });

  await Promise.all(fetches);
  return result;
}

function getAllTransactionsSorted(portfolio: Portfolio): Transaction[] {
  const all: Transaction[] = [];
  for (const pos of Object.values(portfolio.positions)) {
    all.push(...pos.transactions);
  }
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export function computeDailyPortfolioValue(
  portfolio: Portfolio,
  historicalPrices: Record<string, Record<string, number>>,
): { date: string; portfolioValue: number }[] {
  const txns = getAllTransactionsSorted(portfolio);
  if (txns.length === 0) return [];

  const allDates = new Set<string>();
  for (const priceMap of Object.values(historicalPrices)) {
    for (const d of Object.keys(priceMap)) {
      allDates.add(d);
    }
  }
  const sortedDates = Array.from(allDates).sort();
  if (sortedDates.length === 0) return [];

  const firstTxnDate = txns[0].date;
  const relevantDates = sortedDates.filter((d) => d >= firstTxnDate);

  const holdings: Record<string, number> = {};
  let txnIdx = 0;

  const series: { date: string; portfolioValue: number }[] = [];

  for (const date of relevantDates) {
    while (txnIdx < txns.length && txns[txnIdx].date <= date) {
      const t = txns[txnIdx];
      if (t.type === 'BUY') {
        holdings[t.symbol] = (holdings[t.symbol] ?? 0) + t.qty;
      } else {
        holdings[t.symbol] = (holdings[t.symbol] ?? 0) - t.qty;
        if (holdings[t.symbol] <= 0) delete holdings[t.symbol];
      }
      txnIdx++;
    }

    let value = 0;
    let hasAnyPrice = false;
    for (const [sym, qty] of Object.entries(holdings)) {
      const price = historicalPrices[sym]?.[date];
      if (price != null) {
        value += qty * price;
        hasAnyPrice = true;
      }
    }

    if (hasAnyPrice) {
      series.push({ date, portfolioValue: parseFloat(value.toFixed(2)) });
    }
  }

  return series;
}

export function normalizeToPercent(
  values: number[],
): number[] {
  if (values.length === 0) return [];
  const base = values[0];
  if (base === 0) return values.map(() => 0);
  return values.map((v) => parseFloat((((v - base) / base) * 100).toFixed(2)));
}
