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

    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: parseFloat(o.toFixed(2)),
      high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)),
      close: parseFloat(c.toFixed(2)),
      volume: v,
    });
  }

  const shortName = result.meta?.shortName ?? result.meta?.symbol ?? symbol;
  const regularMarketPrice = result.meta?.regularMarketPrice ?? 0;
  const sharesOutstanding = result.meta?.sharesOutstanding;

  let marketCapCr = 0;
  if (sharesOutstanding && regularMarketPrice) {
    marketCapCr = (regularMarketPrice * sharesOutstanding) / 1e7; // 1 Cr = 10 million
  }

  return { symbol, shortName, marketCap: marketCapCr, currentPrice: regularMarketPrice, candles };
}

export async function fetchMarketCap(symbol: string): Promise<number> {
  try {
    const quoteUrl = `${PROXY_BASE}/api/quote/${encodeURIComponent(symbol)}`;
    const quoteRes = await fetch(quoteUrl);
    if (!quoteRes.ok) return 0;
    const quoteData = await quoteRes.json();
    const mc = quoteData?.quoteSummary?.result?.[0]?.summaryDetail?.marketCap?.raw;
    return mc ? mc / 1e7 : 0; // convert to crores
  } catch {
    return 0;
  }
}
