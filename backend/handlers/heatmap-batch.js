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

const CHART_RANGES = {
  '1w': { range: '5d', interval: '1d' },
  '1m': { range: '1mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
};

function pctFromChartPayload(data, symbol) {
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
    shortName: meta.longName || meta.shortName || meta.symbol || symbol,
  };
}

async function fetchChartPct(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  return pctFromChartPayload(data, symbol);
}

async function fetchQuotesBatch(symbols) {
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
        shortName: r.longName ?? r.shortName ?? r.symbol,
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbols, timeframe = '1d' } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ quotes: [] });
  }

  if (timeframe === '1d') {
    const quoteMap = await fetchQuotesBatch(symbols);
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
    return res.status(200).json({ quotes });
  }

  const chartCfg = CHART_RANGES[timeframe];
  if (!chartCfg) {
    return res.status(400).json({ error: 'Invalid timeframe' });
  }

  const CONCURRENCY = 30;
  const chartBySymbol = {};

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = await fetchChartPct(sym, chartCfg.range, chartCfg.interval);
        return { sym, chart };
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value.chart) {
        chartBySymbol[r.value.sym] = r.value.chart;
      }
    }
  }

  const quoteMap = await fetchQuotesBatch(symbols);
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

  return res.status(200).json({ quotes });
}
