import { PatternMatch } from '../types';
import { getTradeSignal, type TradeSignal } from '../lib/tradeSignal';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';
const CHUNK_SIZE = 50;

export interface ScreenerStock {
  symbol: string;
  shortName: string;
  marketCap: number;
}

export interface ScreenerResult {
  symbol: string;
  shortName: string;
  marketCapCr: number;
  currentPrice: number;
  match: PatternMatch;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  allTimeHigh: number;
  sector: string;
  signal: TradeSignal;
}

export interface ScreenerProgress {
  scanned: number;
  total: number;
  found: number;
}

export type ScreenerScanMode = 'today' | 'historical';

export interface ScreenerScanOptions {
  mode: ScreenerScanMode;
  fromDate?: string;
  toDate?: string;
}

const LIST_CACHE_KEY = 'screener-stock-list';
const LIST_CACHE_TTL = 24 * 60 * 60 * 1000;

export async function fetchScreenerList(): Promise<ScreenerStock[]> {
  try {
    const cached = sessionStorage.getItem(LIST_CACHE_KEY);
    if (cached) {
      const { stocks, ts } = JSON.parse(cached);
      if (Date.now() - ts < LIST_CACHE_TTL) return stocks;
    }
  } catch { /* ignore */ }

  const url = `${PROXY_BASE}/api/screener-list`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch screener list (HTTP ${res.status})`);
  const data = await res.json();
  const stocks: ScreenerStock[] = data.stocks ?? [];

  try {
    sessionStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ stocks, ts: Date.now() }));
  } catch { /* quota exceeded, ignore */ }

  return stocks;
}

async function scanChunkOnServer(
  symbols: string[],
  options: ScreenerScanOptions,
): Promise<Omit<ScreenerResult, 'signal'>[]> {
  const url = `${PROXY_BASE}/api/screener-scan`;
  const body: {
    symbols: string[];
    mode: ScreenerScanMode;
    fromDate?: string;
    toDate?: string;
  } = { symbols, mode: options.mode };
  if (options.mode === 'historical') {
    body.fromDate = options.fromDate;
    body.toDate = options.toDate;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Scan failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.results ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runScreener(
  stocks: ScreenerStock[],
  onProgress: (progress: ScreenerProgress) => void,
  onResult: (result: ScreenerResult) => void,
  signal?: AbortSignal,
  options: ScreenerScanOptions = { mode: 'today' },
): Promise<void> {
  const symbolToStock = new Map(stocks.map((s) => [s.symbol, s]));
  let scanned = 0;
  let found = 0;

  for (let i = 0; i < stocks.length; i += CHUNK_SIZE) {
    if (signal?.aborted) return;

    const chunk = stocks.slice(i, i + CHUNK_SIZE);
    const symbols = chunk.map((s) => s.symbol);

    const results = await scanChunkOnServer(symbols, options);

    for (const r of results) {
      const stock = symbolToStock.get(r.symbol);
      if (stock) {
        r.shortName = r.shortName || stock.shortName;
        r.marketCapCr = r.marketCapCr || stock.marketCap / 1e7;
      }
      const full: ScreenerResult = {
        ...r,
        signal: getTradeSignal(r.currentPrice, r.match.buyPrice),
      };
      found++;
      onResult(full);
    }

    scanned = Math.min(i + chunk.length, stocks.length);
    onProgress({ scanned, total: stocks.length, found });

    if (i + CHUNK_SIZE < stocks.length) {
      await sleep(100);
    }
  }
}

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Default date range: last 30 calendar days (local YYYY-MM-DD). */
export function defaultHistoricalRange(): { fromDate: string; toDate: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { fromDate: localDateString(from), toDate: localDateString(to) };
}
