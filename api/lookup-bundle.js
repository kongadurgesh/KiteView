import { getYahooCrumb, UA, fetchYahooChart } from './lib/yahooCrumb.js';

async function fetchQuote(symbol, crumb, cookie) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchProfile(symbol, crumb, cookie) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  if (!response.ok) return { sector: '', industry: '' };
  const data = await response.json();
  const profile = data?.quoteSummary?.result?.[0]?.assetProfile ?? {};
  return { sector: profile.sector ?? '', industry: profile.industry ?? '' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const symbol =
    req.query?.symbol ||
    (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body)?.symbol;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const [chart1y, chartMax, quote, profile] = await Promise.all([
      fetchYahooChart(symbol, '1y', '1d'),
      fetchYahooChart(symbol, 'max', '1mo'),
      fetchQuote(symbol, crumb, cookie),
      fetchProfile(symbol, crumb, cookie),
    ]);

    return res.status(200).json({ chart1y, chartMax, quote, profile });
  } catch (err) {
    return res.status(500).json({ error: 'Lookup bundle failed', details: err.message });
  }
}
