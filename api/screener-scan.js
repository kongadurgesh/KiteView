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

function isRedCandle(c) { return c.close < c.open; }
function isGreenCandle(c) { return c.close > c.open; }
function isHaramiCandle(c1, c2) {
  return c2.high < c1.high && c2.low > c1.low && c2.open >= c1.close && c2.close <= c1.open && isGreenCandle(c2);
}
function isHaramiBreakout(c1, c2, c3) {
  return c3.high > c2.high && c3.high > c1.high && c3.low > c2.low && isGreenCandle(c3) && c3.close > c2.close && c3.close > c1.close && c3.close > c1.open;
}
function isEngulfingCandle(c1, c2) {
  return c2.close > c1.open && c2.open < c1.close && c2.high > c1.high && c2.low < c1.low;
}
function isEngulfingBreakout(c1, c2, c3) {
  return c3.low > c1.low && c3.low > c2.low && c3.high > c2.high && c3.close > c2.close && isGreenCandle(c3);
}

function detectPattern(candles, marketCapCr) {
  if (marketCapCr > 0 && marketCapCr < 5000) return null;
  for (let i = candles.length - 3; i >= 0; i--) {
    const c1 = candles[i], c2 = candles[i + 1], c3 = candles[i + 2];
    if (!isRedCandle(c1)) continue;
    if (c3.volume <= 200000 || c3.close <= 50) continue;
    if (isHaramiCandle(c1, c2) && isHaramiBreakout(c1, c2, c3)) {
      return { patternName: 'Bullish Harami', candle1: c1, candle2: c2, candle3: c3,
        buyPrice: parseFloat((0.98 * c3.close).toFixed(2)), buyTriggerPrice: parseFloat((0.985 * c3.close).toFixed(2)) };
    }
    if (isEngulfingCandle(c1, c2) && isEngulfingBreakout(c1, c2, c3)) {
      return { patternName: 'Bullish Engulfing', candle1: c1, candle2: c2, candle3: c3,
        buyPrice: parseFloat((0.98 * c3.close).toFixed(2)), buyTriggerPrice: parseFloat((0.985 * c3.close).toFixed(2)) };
    }
  }
  return null;
}

async function fetchChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return null;
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i], h = quote.high?.[i], l = quote.low?.[i], c = quote.close?.[i], v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null || v === 0) continue;
    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: parseFloat(o.toFixed(2)), high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)), close: parseFloat(c.toFixed(2)), volume: v,
    });
  }
  const meta = result.meta ?? {};
  return {
    candles, currentPrice: meta.regularMarketPrice ?? 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    shortName: meta.shortName || meta.symbol || symbol,
  };
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const CONCURRENCY = 25;
  const matches = [];

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = await fetchChart(sym);
        if (!chart || chart.candles.length < 3) return null;
        const lastDate = chart.candles[chart.candles.length - 1].date;
        const match = detectPattern(chart.candles, 10000);
        if (!match || match.candle3.date !== lastDate) return null;
        return {
          symbol: sym, shortName: chart.shortName,
          marketCapCr: 0, currentPrice: chart.currentPrice, match,
          fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: chart.fiftyTwoWeekLow,
          allTimeHigh: 0, sector: '',
        };
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) matches.push(r.value);
    }
  }

  if (matches.length > 0) {
    const matchSymbols = matches.map((m) => m.symbol);
    const [sectorMap, ...athValues] = await Promise.all([
      fetchSectorBatch(matchSymbols),
      ...matchSymbols.map((s) => fetchATH(s)),
    ]);
    for (let i = 0; i < matches.length; i++) {
      const info = sectorMap[matches[i].symbol];
      if (info) {
        matches[i].sector = info.sector;
        matches[i].marketCapCr = info.marketCapCr;
      }
      matches[i].allTimeHigh = athValues[i] ?? 0;
    }
  }

  res.status(200).json({ results: matches });
}
