import { getYahooCrumb } from '../yahooCrumb.js';

const CONCURRENCY = 30;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function emptyStats(symbol) {
  return {
    pe: null,
    forwardPE: null,
    pb: null,
    beta: null,
    fiftyTwoWeekChange: null,
    marketCap: null,
    shortName: symbol,
    regularMarketPrice: null,
    sector: '',
  };
}

async function fetchStats(symbol) {
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
    return emptyStats(symbol);
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbols } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ stats: {} });
  }

  const stats = {};
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (sym) => ({ sym, data: await fetchStats(sym) })),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        stats[r.value.sym] = r.value.data;
      }
    }
  }

  return res.status(200).json({ stats });
}
