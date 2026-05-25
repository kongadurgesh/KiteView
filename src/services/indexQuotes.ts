import type { IndexInstrument } from '../data/indicesCatalog';
import { indexPriceDecimals } from '../data/indicesCatalog';
import { fmtNumber } from '../lib/format';
import { API_BASE } from '../lib/apiBase';

export const INDEX_QUOTE_REFRESH_MS = 15_000;

export interface IndexQuote {
  instrument: IndexInstrument;
  price: number | null;
  change: number | null;
  changePct: number | null;
}

interface YahooQuoteRow {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

/** Yahoo v7 quote often returns 0% change for some European indices while price is valid. */
function quoteChangeStale(
  price: number | null,
  change: number | null,
  changePct: number | null,
): boolean {
  if (price == null || price <= 0) return false;
  return (change ?? 0) === 0 && (changePct ?? 0) === 0;
}

async function fetchDayChangeFromChart(
  symbol: string,
): Promise<{ change: number; changePct: number } | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const closes =
      (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as (number | null)[] | undefined)?.filter(
        (c): c is number => c != null && !Number.isNaN(c),
      ) ?? [];
    if (closes.length < 2) return null;
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    if (!prev) return null;
    const change = last - prev;
    const changePct = (change / prev) * 100;
    return { change, changePct };
  } catch {
    return null;
  }
}

export function formatIndexPrice(q: IndexQuote): string {
  if (q.price == null) return '—';
  const opts = indexPriceDecimals(q.instrument.category);
  return fmtNumber(q.price, opts);
}

export function formatIndexChange(q: IndexQuote): string {
  if (q.change == null) return '—';
  const opts = indexPriceDecimals(q.instrument.category);
  const s = fmtNumber(Math.abs(q.change), opts);
  return `${q.change >= 0 ? '+' : '-'}${s}`;
}

export async function fetchIndexQuotes(instruments: IndexInstrument[]): Promise<IndexQuote[]> {
  if (instruments.length === 0) return [];

  const bySymbol = new Map(instruments.map((i) => [i.symbol, i]));

  try {
    const joined = [...bySymbol.keys()].join(',');
    const res = await fetch(`${API_BASE}/api/quote/${encodeURIComponent(joined)}`);
    if (!res.ok) {
      return instruments.map((instrument) => ({
        instrument,
        price: null,
        change: null,
        changePct: null,
      }));
    }

    const data = await res.json();
    const rows: YahooQuoteRow[] = data?.quoteResponse?.result ?? [];
    const quoteBySymbol = new Map<string, YahooQuoteRow>();
    for (const row of rows) {
      if (row.symbol) quoteBySymbol.set(row.symbol, row);
    }

    const quotes: IndexQuote[] = instruments.map((instrument) => {
      const q = quoteBySymbol.get(instrument.symbol);
      return {
        instrument,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
      };
    });

    const stale = quotes.filter((q) => quoteChangeStale(q.price, q.change, q.changePct));
    if (stale.length === 0) return quotes;

    await Promise.all(
      stale.map(async (q) => {
        const fromChart = await fetchDayChangeFromChart(q.instrument.symbol);
        if (!fromChart || fromChart.changePct === 0) return;
        q.change = fromChart.change;
        q.changePct = fromChart.changePct;
      }),
    );

    return quotes;
  } catch {
    return instruments.map((instrument) => ({
      instrument,
      price: null,
      change: null,
      changePct: null,
    }));
  }
}
