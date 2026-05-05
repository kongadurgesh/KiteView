import { Candle, StockInfo } from '../types';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

export async function fetchStockData(symbol: string): Promise<StockInfo> {
  const chartUrl = `${PROXY_BASE}/api/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const chartRes = await fetch(chartUrl);
  if (!chartRes.ok) throw new Error(`Failed to fetch chart data (HTTP ${chartRes.status})`);
  const chartData = await chartRes.json();

  const result = chartData?.chart?.result?.[0];
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
    symbol, shortName, marketCap: marketCapCr, currentPrice: regularMarketPrice,
    fiftyTwoWeekHigh, fiftyTwoWeekLow, candles,
  };
}

export async function fetchAllTimeHigh(symbol: string): Promise<number> {
  try {
    const url = `${PROXY_BASE}/api/chart/${encodeURIComponent(symbol)}?range=max&interval=1mo`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    const highs: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.high ?? [];
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

export async function fetchStockMeta(symbol: string): Promise<StockMeta> {
  try {
    const quoteUrl = `${PROXY_BASE}/api/quote/${encodeURIComponent(symbol)}`;
    const quoteRes = await fetch(quoteUrl);
    if (!quoteRes.ok) return { marketCapCr: 0, sector: '', industry: '' };
    const quoteData = await quoteRes.json();
    const r = quoteData?.quoteResponse?.result?.[0];
    const mc = r?.marketCap;
    return {
      marketCapCr: mc ? mc / 1e7 : 0,
      sector: r?.sector ?? '',
      industry: r?.industry ?? '',
    };
  } catch {
    return { marketCapCr: 0, sector: '', industry: '' };
  }
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  try {
    const joined = symbols.join(',');
    const url = `${PROXY_BASE}/api/quote/${encodeURIComponent(joined)}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const results = data?.quoteResponse?.result ?? [];
    const prices: Record<string, number> = {};
    for (const r of results) {
      if (r.symbol && r.regularMarketPrice != null) {
        prices[r.symbol] = r.regularMarketPrice;
      }
    }
    return prices;
  } catch {
    return {};
  }
}
