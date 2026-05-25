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

    return instruments.map((instrument) => {
      const q = quoteBySymbol.get(instrument.symbol);
      return {
        instrument,
        price: q?.regularMarketPrice ?? null,
        change: q?.regularMarketChange ?? null,
        changePct: q?.regularMarketChangePercent ?? null,
      };
    });
  } catch {
    return instruments.map((instrument) => ({
      instrument,
      price: null,
      change: null,
      changePct: null,
    }));
  }
}
