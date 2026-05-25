import { resolveYahooSymbol } from '../yahooSymbol.js';

export default async function handler(req, res) {
  const q = (req.query.q || req.query.symbol || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'q query parameter required' });
  }

  try {
    const symbol = await resolveYahooSymbol(q, { 'User-Agent': 'Mozilla/5.0' });
    if (!symbol) {
      return res.status(404).json({ error: 'Symbol not found', query: q });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ symbol, query: q });
  } catch (err) {
    res.status(500).json({ error: 'Resolve failed', details: err.message });
  }
}
