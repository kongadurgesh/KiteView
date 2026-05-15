import { getYahooCrumb, UA, runConcurrent } from './lib/yahooCrumb.js';

const CONCURRENCY = 12;

function parseDividends(data) {
  const result = data?.quoteSummary?.result?.[0] ?? {};
  const sd = result.summaryDetail ?? {};
  const ce = result.calendarEvents ?? {};
  return {
    dividendRate: sd.dividendRate?.raw ?? 0,
    dividendYield: sd.dividendYield?.raw ?? 0,
    trailingAnnualDividendRate: sd.trailingAnnualDividendRate?.raw ?? 0,
    exDividendDate: ce.exDividendDate?.fmt ?? null,
  };
}

const emptyDividends = {
  dividendRate: 0,
  dividendYield: 0,
  trailingAnnualDividendRate: 0,
  exDividendDate: null,
};

async function fetchDividends(symbol, crumb, cookie) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,calendarEvents&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  if (!response.ok) return emptyDividends;
  const data = await response.json();
  return parseDividends(data);
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
    return res.status(200).json({ dividends: {} });
  }

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const dividends = await runConcurrent(symbols, CONCURRENCY, (sym) =>
      fetchDividends(sym, crumb, cookie),
    );
    return res.status(200).json({ dividends });
  } catch (err) {
    return res.status(500).json({ error: 'Dividends batch failed', details: err.message });
  }
}
