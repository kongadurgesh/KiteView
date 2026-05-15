import { fetchYahooChart, runConcurrent } from './lib/yahooCrumb.js';

const CONCURRENCY = 20;

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
  const range = body.range || '1y';
  const interval = body.interval || '1d';

  if (symbols.length === 0) {
    return res.status(200).json({ charts: {} });
  }

  try {
    const charts = await runConcurrent(symbols, CONCURRENCY, (sym) =>
      fetchYahooChart(sym, range, interval),
    );
    return res.status(200).json({ charts });
  } catch (err) {
    return res.status(500).json({ error: 'Chart batch failed', details: err.message });
  }
}
