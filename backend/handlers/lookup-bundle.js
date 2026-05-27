import { getYahooCrumb } from '../yahooCrumb.js';
import { fetchAnalysisExtras, normalizeQuarterlyResults } from '../analysisBundleParse.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function fetchChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  return response.json();
}

async function fetchQuote(symbol) {
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const symbol = req.query.symbol;
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'symbol query parameter is required' });
  }

  const [chart1y, chartMax, quote, extras] = await Promise.all([
    fetchChart(symbol, '1y', '1d'),
    fetchChart(symbol, 'max', '1d'),
    fetchQuote(symbol),
    fetchAnalysisExtras(symbol, getYahooCrumb),
  ]);

  return res.status(200).json({
    chart1y: chart1y ?? null,
    chartMax: chartMax ?? null,
    quote: quote ?? null,
    profile: extras.profile,
    financials: extras.financials,
    recommendations: extras.recommendations,
    news: extras.news,
    quarterlyResults: normalizeQuarterlyResults(extras.quarterlyResults),
    quarterlyResultsRaw: extras.quarterlyResultsRaw,
  });
}
