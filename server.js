import express from 'express';
import cors from 'cors';
import { detectPattern, detectPatternInRange } from './api/lib/patternDetect.js';

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

function parseChartDirectResult(result, symbol) {
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

async function fetchChartDirect(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  return parseChartDirectResult(result, symbol);
}

async function fetchChartRangeDirect(symbol, fromDate, toDate) {
  const period1 = Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) - 7 * 86400;
  const period2 = Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  return parseChartDirectResult(result, symbol);
}

function validateScreenerDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 'Invalid date format';
  if (from > to) return 'fromDate must be on or before toDate';
  if ((to - from) / 86400000 > 365) return 'Date range cannot exceed 365 days';
  return null;
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
  const { symbols, mode, fromDate, toDate } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.json({ results: [] });
  }

  const historical = mode === 'historical';
  if (historical) {
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required for historical scan' });
    }
    const err = validateScreenerDateRange(fromDate, toDate);
    if (err) return res.status(400).json({ error: err });
  }

  const CONCURRENCY = 30;
  const matches = [];

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = historical
          ? await fetchChartRangeDirect(sym, fromDate, toDate)
          : await fetchChartDirect(sym);
        if (!chart || chart.candles.length < 3) return null;

        const match = historical
          ? detectPatternInRange(chart.candles, 10000, fromDate, toDate)
          : (() => {
              const lastDate = chart.candles[chart.candles.length - 1].date;
              const m = detectPattern(chart.candles, 10000);
              return m && m.candle3.date === lastDate ? m : null;
            })();

        if (!match) return null;
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

async function fetchHeatmapChartPct(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return null;
  const closes = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (c == null || v == null || v === 0) continue;
    closes.push(c);
  }
  if (closes.length < 2) return null;
  const first = closes[0];
  const last = closes[closes.length - 1];
  if (first <= 0) return null;
  const meta = result.meta ?? {};
  return {
    changePercent: ((last - first) / first) * 100,
    regularMarketPrice: meta.regularMarketPrice ?? last,
    shortName: meta.shortName || meta.symbol || symbol,
  };
}

async function fetchHeatmapQuotesBatch(symbols) {
  if (symbols.length === 0) return {};
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const out = {};
    for (const r of data?.quoteResponse?.result ?? []) {
      if (!r.symbol) continue;
      out[r.symbol] = {
        shortName: r.shortName ?? r.symbol,
        regularMarketPrice: r.regularMarketPrice ?? 0,
        changePercent: r.regularMarketChangePercent ?? 0,
        marketCap: r.marketCap ?? 0,
        sector: r.sector ?? '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

const HEATMAP_CHART_RANGES = {
  '1w': { range: '5d', interval: '1d' },
  '1m': { range: '1mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
};

app.post('/api/heatmap-batch', async (req, res) => {
  const { symbols, timeframe = '1d' } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.json({ quotes: [] });
  }

  if (timeframe === '1d') {
    const quoteMap = await fetchHeatmapQuotesBatch(symbols);
    const quotes = symbols
      .map((sym) => {
        const r = quoteMap[sym];
        if (!r || r.regularMarketPrice <= 0) return null;
        return {
          symbol: sym,
          shortName: r.shortName,
          regularMarketPrice: r.regularMarketPrice,
          changePercent: r.changePercent,
          marketCap: r.marketCap,
          sector: r.sector,
        };
      })
      .filter(Boolean);
    return res.json({ quotes });
  }

  const chartCfg = HEATMAP_CHART_RANGES[timeframe];
  if (!chartCfg) {
    return res.status(400).json({ error: 'Invalid timeframe' });
  }

  const CONCURRENCY = 30;
  const chartBySymbol = {};

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = await fetchHeatmapChartPct(sym, chartCfg.range, chartCfg.interval);
        return { sym, chart };
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value.chart) {
        chartBySymbol[r.value.sym] = r.value.chart;
      }
    }
  }

  const quoteMap = await fetchHeatmapQuotesBatch(symbols);
  const quotes = symbols
    .map((sym) => {
      const chart = chartBySymbol[sym];
      if (!chart) return null;
      const q = quoteMap[sym];
      const price = q?.regularMarketPrice ?? chart.regularMarketPrice;
      if (price <= 0) return null;
      return {
        symbol: sym,
        shortName: q?.shortName ?? chart.shortName ?? sym,
        regularMarketPrice: price,
        changePercent: chart.changePercent,
        marketCap: q?.marketCap ?? 0,
        sector: q?.sector ?? '',
      };
    })
    .filter(Boolean);

  res.json({ quotes });
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

async function fetchChartPayload(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  return response.json();
}

async function fetchStatsPayload(symbol) {
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,summaryDetail,price&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0] ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const sd = result.summaryDetail ?? {};
    const pr = result.price ?? {};
    return {
      pe: sd.trailingPE?.raw ?? null,
      forwardPE: sd.forwardPE?.raw ?? null,
      pb: ks.priceToBook?.raw ?? null,
      beta: ks.beta?.raw ?? null,
      fiftyTwoWeekChange: ks.fiftyTwoWeekChange?.raw ?? null,
      marketCap: pr.marketCap?.raw ?? null,
      shortName: pr.shortName ?? symbol,
      regularMarketPrice: pr.regularMarketPrice?.raw ?? null,
      sector: pr.sector ?? '',
    };
  } catch {
    return {
      pe: null,
      pb: null,
      beta: null,
      forwardPE: null,
      fiftyTwoWeekChange: null,
      marketCap: null,
      shortName: symbol,
      regularMarketPrice: null,
      sector: '',
    };
  }
}

app.post('/api/chart-batch', async (req, res) => {
  const { symbols, range = '1y', interval = '1d' } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.json({ charts: {} });
  }
  const CONCURRENCY = 30;
  const charts = {};
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const data = await fetchChartPayload(sym, range, interval);
        return { sym, data };
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data) {
        charts[r.value.sym] = r.value.data;
      }
    }
  }
  res.json({ charts });
});

app.post('/api/stats-batch', async (req, res) => {
  const { symbols } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.json({ stats: {} });
  }
  const CONCURRENCY = 30;
  const stats = {};
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (sym) => ({ sym, data: await fetchStatsPayload(sym) })),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        stats[r.value.sym] = r.value.data;
      }
    }
  }
  res.json({ stats });
});

app.get('/api/lookup-bundle', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).json({ error: 'symbol query parameter is required' });
  }
  try {
    const { fetchQuoteSummary, parseProfile, parseFinancial, parseRecommendations, parseNews } =
      await import('./api/lib/analysisBundleParse.js');
    const { crumb, cookie } = await getYahooCrumb();
    const quoteUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`;

    const [chart1y, chartMax, quoteRes, summaryData, newsData] = await Promise.all([
      fetchChartPayload(symbol, '1y', '1d'),
      fetchChartPayload(symbol, 'max', '1d'),
      fetch(quoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie } }),
      fetchQuoteSummary(symbol, 'assetProfile,financialData,recommendationTrend', crumb, cookie),
      fetchQuoteSummary(symbol, 'news', crumb, cookie),
    ]);

    let quote = null;
    if (quoteRes.ok) quote = await quoteRes.json();

    const summaryResult = summaryData?.quoteSummary?.result?.[0] ?? {};
    const newsResult = newsData?.quoteSummary?.result?.[0] ?? {};

    res.json({
      chart1y: chart1y ?? null,
      chartMax: chartMax ?? null,
      quote,
      profile: parseProfile(summaryResult.assetProfile ?? {}),
      financials: parseFinancial(summaryResult.financialData ?? {}),
      recommendations: parseRecommendations(summaryResult.recommendationTrend ?? {}),
      news: parseNews(newsResult ?? {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Lookup bundle failed', details: err.message });
  }
});

app.get('/api/stats/:symbol', async (req, res) => {
  const { symbol } = req.params;
  res.json(await fetchStatsPayload(symbol));
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
