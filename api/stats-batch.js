import { getYahooCrumb, UA, runConcurrent } from './lib/yahooCrumb.js';

const CONCURRENCY = 12;

function parseStats(symbol, data) {
  const result = data?.quoteSummary?.result?.[0] ?? {};
  const ks = result.defaultKeyStatistics ?? {};
  const sd = result.summaryDetail ?? {};
  const pr = result.price ?? {};
  return {
    pe: sd.trailingPE?.raw ?? null,
    forwardPE: sd.forwardPE?.raw ?? null,
    pb: ks.priceToBook?.raw ?? null,
    beta: ks.beta?.raw ?? null,
    dividendYield: sd.dividendYield?.raw ?? null,
    fiftyTwoWeekChange: ks.fiftyTwoWeekChange?.raw ?? null,
    marketCap: pr.marketCap?.raw ?? null,
    shortName: pr.shortName ?? symbol,
    regularMarketPrice: pr.regularMarketPrice?.raw ?? null,
    sector: pr.sector ?? '',
  };
}

function emptyStats(symbol) {
  return {
    pe: null,
    forwardPE: null,
    pb: null,
    beta: null,
    dividendYield: null,
    fiftyTwoWeekChange: null,
    marketCap: null,
    shortName: symbol,
    regularMarketPrice: null,
    sector: '',
  };
}

async function fetchStats(symbol, crumb, cookie) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,summaryDetail,price&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  if (!response.ok) return emptyStats(symbol);
  const data = await response.json();
  return parseStats(symbol, data);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const symbols = Array.isArray(body.symbols) ? body.symbols.filter(Boolean) : [];

  if (symbols.length === 0) {
    return res.status(200).json({ stats: {} });
  }

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const stats = await runConcurrent(symbols, CONCURRENCY, (sym) => fetchStats(sym, crumb, cookie));
    return res.status(200).json({ stats });
  } catch (err) {
    return res.status(500).json({ error: 'Stats batch failed', details: err.message });
  }
}
