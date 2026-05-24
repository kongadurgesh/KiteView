import { detectPattern, detectPatternInRange } from './lib/patternDetect.js';
import { fetchTrendlyneSwotCounts } from './lib/trendlyneSwot.js';

let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': ua }, redirect: 'manual',
  });
  const setCookie = cookieRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': ua, Cookie: cookie },
  });
  const crumb = await crumbRes.text();
  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = Date.now() + 10 * 60 * 1000;
  return { crumb, cookie };
}

function parseChartResult(result) {
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
    currentPrice: meta.regularMarketPrice ?? 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    shortName: meta.shortName || meta.symbol || '',
  };
}

async function fetchChartLive(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const parsed = parseChartResult(result);
  if (parsed) parsed.shortName = parsed.shortName || result.meta?.symbol || symbol;
  return parsed;
}

async function fetchChartRange(symbol, fromDate, toDate) {
  const period1 = Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) - 7 * 86400;
  const period2 = Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const parsed = parseChartResult(result);
  if (parsed) parsed.shortName = parsed.shortName || result.meta?.symbol || symbol;
  return parsed;
}

async function fetchATH(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=max&interval=1mo&includePrePost=false`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return 0;
    const data = await response.json();
    const highs = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.high ?? [];
    let ath = 0;
    for (const h of highs) { if (h != null && h > ath) ath = h; }
    return parseFloat(ath.toFixed(2));
  } catch { return 0; }
}

async function fetchSectorBatch(symbols) {
  if (symbols.length === 0) return {};
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const result = {};
    for (const r of (data?.quoteResponse?.result ?? [])) {
      result[r.symbol] = { sector: r.sector ?? '', marketCapCr: r.marketCap ? r.marketCap / 1e7 : 0 };
    }
    return result;
  } catch { return {}; }
}

function validateDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'Invalid date format (use YYYY-MM-DD)';
  }
  if (from > to) return 'fromDate must be on or before toDate';
  const days = (to - from) / 86400000;
  if (days > 365) return 'Date range cannot exceed 365 days';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols, mode, fromDate, toDate } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const historical = mode === 'historical';
  if (historical) {
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required for historical scan' });
    }
    const err = validateDateRange(fromDate, toDate);
    if (err) return res.status(400).json({ error: err });
  }

  const CONCURRENCY = 25;
  const matches = [];

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = historical
          ? await fetchChartRange(sym, fromDate, toDate)
          : await fetchChartLive(sym);
        if (!chart || chart.candles.length < 3) return null;

        const match = historical
          ? detectPatternInRange(chart.candles, 0, fromDate, toDate)
          : (() => {
              const lastDate = chart.candles[chart.candles.length - 1].date;
              const m = detectPattern(chart.candles, 0);
              return m && m.candle3.date === lastDate ? m : null;
            })();

        if (!match) return null;
        return {
          symbol: sym,
          shortName: chart.shortName,
          marketCapCr: 0,
          currentPrice: chart.currentPrice,
          match,
          fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: chart.fiftyTwoWeekLow,
          allTimeHigh: 0,
          sector: '',
        };
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) matches.push(r.value);
    }
  }

  if (matches.length > 0) {
    const matchSymbols = matches.map((m) => m.symbol);
    const [sectorMap, ...athAndSwot] = await Promise.all([
      fetchSectorBatch(matchSymbols),
      ...matchSymbols.map(async (s) => {
        const [ath, swot] = await Promise.all([fetchATH(s), fetchTrendlyneSwotCounts(s)]);
        return { ath, swot };
      }),
    ]);
    for (let j = 0; j < matches.length; j++) {
      const info = sectorMap[matches[j].symbol];
      if (info) {
        matches[j].sector = info.sector;
        matches[j].marketCapCr = info.marketCapCr;
      }
      const extra = athAndSwot[j];
      matches[j].allTimeHigh = extra?.ath ?? 0;
      matches[j].swotStrengths = extra?.swot?.strengths ?? null;
      matches[j].swotWeaknesses = extra?.swot?.weaknesses ?? null;
    }
  }

  res.status(200).json({ results: matches });
}
