import { Candle, StockInfo } from '../types';
import { fetchChartBatch, fetchLookupBundle } from './apiBatch';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

function parseStockInfoFromChart(chartData: unknown, symbol: string): StockInfo {
  const result = (chartData as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as {
    timestamp?: number[];
    indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
    meta?: {
      shortName?: string;
      symbol?: string;
      regularMarketPrice?: number;
      sharesOutstanding?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
    };
  } | undefined;

  if (!result) throw new Error('No data returned for this symbol. Check the ticker and try again.');

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) throw new Error('No quote data available.');

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    if (v === 0) continue;

    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: parseFloat(o.toFixed(2)),
      high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)),
      close: parseFloat(c.toFixed(2)),
      volume: v,
    });
  }

  const meta = result.meta ?? {};
  const shortName = meta.shortName ?? meta.symbol ?? symbol;
  const regularMarketPrice = meta.regularMarketPrice ?? 0;
  const sharesOutstanding = meta.sharesOutstanding;
  const fiftyTwoWeekHigh = meta.fiftyTwoWeekHigh ?? 0;
  const fiftyTwoWeekLow = meta.fiftyTwoWeekLow ?? 0;

  let marketCapCr = 0;
  if (sharesOutstanding && regularMarketPrice) {
    marketCapCr = (regularMarketPrice * sharesOutstanding) / 1e7;
  }

  return {
    symbol,
    shortName,
    marketCap: marketCapCr,
    currentPrice: regularMarketPrice,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    candles,
  };
}

function parseAthFromChart(chartData: unknown): number {
  try {
    const highs: (number | null)[] =
      (chartData as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ high?: (number | null)[] }> } }> } })
        ?.chart?.result?.[0]?.indicators?.quote?.[0]?.high ?? [];
    let ath = 0;
    for (const h of highs) {
      if (h != null && h > ath) ath = h;
    }
    return parseFloat(ath.toFixed(2));
  } catch {
    return 0;
  }
}

export interface StockMeta {
  marketCapCr: number;
  sector: string;
  industry: string;
}

function parseMetaFromBundle(
  quoteData: unknown,
  profile: { sector: string; industry: string },
): StockMeta {
  const r = (quoteData as { quoteResponse?: { result?: Array<{ marketCap?: number; sector?: string; industry?: string }> } })
    ?.quoteResponse?.result?.[0];
  const mc = r?.marketCap;
  return {
    marketCapCr: mc ? mc / 1e7 : 0,
    sector: profile.sector || r?.sector || '',
    industry: profile.industry || r?.industry || '',
  };
}

export interface LookupData {
  stockInfo: StockInfo;
  allTimeHigh: number;
  meta: StockMeta;
}

/** Single request: chart (1y + max), quote, and profile for pattern lookup. */
export async function fetchLookupData(symbol: string): Promise<LookupData> {
  const bundle = await fetchLookupBundle(symbol);
  const stockInfo = parseStockInfoFromChart(bundle.chart1y, symbol);
  const allTimeHigh = parseAthFromChart(bundle.chartMax);
  const meta = parseMetaFromBundle(bundle.quote, bundle.profile);
  return { stockInfo, allTimeHigh, meta };
}

export async function fetchStockData(symbol: string): Promise<StockInfo> {
  const charts = await fetchChartBatch([symbol], '1y', '1d');
  const chartData = charts[symbol];
  if (!chartData) throw new Error(`Failed to fetch chart data for ${symbol}`);
  return parseStockInfoFromChart(chartData, symbol);
}

export async function fetchAllTimeHigh(symbol: string): Promise<number> {
  try {
    const charts = await fetchChartBatch([symbol], 'max', '1mo');
    return parseAthFromChart(charts[symbol]);
  } catch {
    return 0;
  }
}

export async function fetchStockMeta(symbol: string): Promise<StockMeta> {
  try {
    const bundle = await fetchLookupBundle(symbol);
    return parseMetaFromBundle(bundle.quote, bundle.profile);
  } catch {
    return { marketCapCr: 0, sector: '', industry: '' };
  }
}

export interface LiveQuoteDetailed {
  price: number;
  previousClose: number;
}

export async function fetchBatchQuotesDetailed(symbols: string[]): Promise<Record<string, LiveQuoteDetailed>> {
  if (symbols.length === 0) return {};
  try {
    const joined = symbols.join(',');
    const url = `${PROXY_BASE}/api/quote/${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const results = data?.quoteResponse?.result ?? [];
    const out: Record<string, LiveQuoteDetailed> = {};
    for (const r of results) {
      if (r.symbol && r.regularMarketPrice != null) {
        out[r.symbol] = {
          price: r.regularMarketPrice,
          previousClose: r.regularMarketPreviousClose ?? r.regularMarketPrice,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export type HeatmapTimeframe = '1d' | '1w' | '1m' | '1y';

export interface QuoteFull {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  changePercent: number;
  marketCap: number;
  sector: string;
}

export async function fetchHeatmapBatch(symbols: string[], timeframe: HeatmapTimeframe): Promise<QuoteFull[]> {
  if (symbols.length === 0) return [];
  try {
    const res = await fetch(`${PROXY_BASE}/api/heatmap-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols, timeframe }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.quotes ?? [];
    return quotes.map((r: Record<string, unknown>) => ({
      symbol: (r.symbol as string) ?? '',
      shortName: (r.shortName as string) ?? (r.symbol as string) ?? '',
      regularMarketPrice: (r.regularMarketPrice as number) ?? 0,
      changePercent: (r.changePercent as number) ?? 0,
      marketCap: (r.marketCap as number) ?? 0,
      sector: (r.sector as string) ?? '',
    }));
  } catch {
    return [];
  }
}

export async function fetchBatchQuotesFull(symbols: string[]): Promise<QuoteFull[]> {
  return fetchHeatmapBatch(symbols, '1d');
}
