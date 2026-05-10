import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3006;

app.use(cors());

app.get('/api/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const range = req.query.range || '1y';
  const interval = req.query.interval || '1d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance', details: err.message });
  }
});

let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': ua },
    redirect: 'manual',
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

app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quote data', details: err.message });
  }
});

app.get('/api/profile/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile ?? {};
    res.json({ sector: profile.sector ?? '', industry: profile.industry ?? '' });
  } catch {
    res.json({ sector: '', industry: '' });
  }
});

app.use(express.json());

app.get('/api/screener-list', async (req, res) => {
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const minMarketCap = 10_000_000_000; // 1000 crore in INR

    const allSymbols = [];
    let offset = 0;
    const size = 250;

    while (true) {
      const url = `https://query2.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(crumb)}`;
      const body = {
        offset,
        size,
        sortField: 'intradaymarketcap',
        sortType: 'DESC',
        quoteType: 'EQUITY',
        query: {
          operator: 'AND',
          operands: [
            { operator: 'eq', operands: ['region', 'in'] },
            { operator: 'gt', operands: ['intradaymarketcap', minMarketCap] },
          ],
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const quotes = data?.finance?.result?.[0]?.quotes ?? [];

      for (const q of quotes) {
        if (q.symbol?.endsWith('.BO')) continue;
        allSymbols.push({
          symbol: q.symbol,
          shortName: q.shortName || q.longName || q.symbol,
          marketCap: q.marketCap ?? 0,
        });
      }

      const total = data?.finance?.result?.[0]?.total ?? 0;
      offset += size;
      if (offset >= total || quotes.length === 0) break;
    }

    res.json({ stocks: allSymbols, total: allSymbols.length });
  } catch (err) {
    res.status(500).json({ error: 'Screener list failed', details: err.message });
  }
});

// --- Pattern detection logic (shared with frontend) ---

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

function serverDetectPattern(candles, marketCapCr) {
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

async function fetchChartDirect(symbol) {
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

app.post('/api/screener-scan', async (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.json({ results: [] });
  }

  const CONCURRENCY = 30;
  const matches = [];

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = await fetchChartDirect(sym);
        if (!chart || chart.candles.length < 3) return null;
        const lastDate = chart.candles[chart.candles.length - 1].date;
        const match = serverDetectPattern(chart.candles, 10000);
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

  res.json({ results: matches });
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  const headers = { 'User-Agent': 'Mozilla/5.0' };

  async function searchYahoo(query) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    return (data.quotes || [])
      .filter((item) => item.exchange === 'NSI' || item.exchange === 'BSE')
      .map((item) => ({ symbol: item.symbol, shortname: item.shortname, exchange: item.exchange }));
  }

  try {
    let results = await searchYahoo(q);

    // If no Indian results, also try the symbol directly with .NS suffix
    if (results.length === 0) {
      const directSymbol = q.includes('.') ? q : `${q}.NS`;
      const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(directSymbol)}?range=1d&interval=1d`;
      const chartRes = await fetch(chartUrl, { headers });
      const chartData = await chartRes.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      if (meta) {
        results.push({ symbol: meta.symbol, shortname: meta.shortName || meta.symbol, exchange: meta.exchangeName });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
