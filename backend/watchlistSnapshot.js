import { detectPattern, detectPatternInRange } from './patternDetect.js';
import { fetchTrendlyneSwotCounts } from './trendlyneSwot.js';

function dayChangePercent(candles) {
  if (!candles?.length || candles.length < 2) return null;
  const last = candles[candles.length - 1].close;
  const prev = candles[candles.length - 2].close;
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
}

function patternOnLatestSession(candles) {
  if (!candles?.length || candles.length < 3) return false;
  const lastDate = candles[candles.length - 1].date;
  return detectPatternInRange(candles, 0, lastDate, lastDate) != null;
}

function parseChartResult(result, symbol) {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return null;
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null || v === 0) continue;
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
  return {
    candles,
    currentPrice: meta.regularMarketPrice ?? candles[candles.length - 1]?.close ?? 0,
    shortName: meta.shortName || meta.symbol || symbol,
    changePercent: dayChangePercent(candles) ?? meta.regularMarketChangePercent ?? null,
  };
}

async function fetchChart(symbol, range) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  return parseChartResult(result, symbol);
}

function tradeSignal(cmp, buyPrice) {
  if (cmp <= 0 || buyPrice <= 0) return 'WAIT';
  return cmp <= buyPrice * 1.02 ? 'BUY' : 'WAIT';
}

export async function buildWatchlistSnapshot(symbol) {
  const [chart1y, chart5d, swot] = await Promise.all([
    fetchChart(symbol, '1y'),
    fetchChart(symbol, '5d'),
    fetchTrendlyneSwotCounts(symbol),
  ]);

  const chart = chart1y ?? chart5d;
  if (!chart) return null;

  const match = detectPattern(chart.candles, 0);
  const candles5d = chart5d?.candles ?? [];
  const candles1y = chart1y?.candles ?? chart.candles;
  const patternToday = patternOnLatestSession(candles5d) || patternOnLatestSession(candles1y);

  const buyPrice = match?.buyPrice ?? null;
  const cmp = chart5d?.currentPrice ?? chart.currentPrice ?? 0;
  const signal = buyPrice ? tradeSignal(cmp, buyPrice) : 'WAIT';

  return {
    symbol,
    shortName: chart.shortName,
    currentPrice: cmp,
    changePercent:
      dayChangePercent(candles5d)
      ?? dayChangePercent(candles1y)
      ?? chart5d?.changePercent
      ?? chart.changePercent
      ?? null,
    signal,
    buyPrice,
    patternName: match?.patternName ?? null,
    patternDate: match?.candle3?.date ?? null,
    patternToday,
    swotStrengths: swot?.strengths ?? null,
    swotWeaknesses: swot?.weaknesses ?? null,
    swotHealthy: swot != null && swot.strengths >= swot.weaknesses,
  };
}

export async function buildWatchlistSnapshots(symbols, concurrency = 8) {
  const out = {};
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((sym) => buildWatchlistSnapshot(sym)));
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled' && r.value) out[batch[j]] = r.value;
    }
  }
  return out;
}
