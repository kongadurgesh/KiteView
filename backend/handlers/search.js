import { chartMeta, searchYahooEquities } from '../yahooSymbol.js';

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  const headers = { 'User-Agent': 'Mozilla/5.0' };

  try {
    let results = q.length >= 1 ? await searchYahooEquities(q, headers) : [];

    if (results.length === 0 && q.length >= 1) {
      const upper = q.toUpperCase();
      const direct = await chartMeta(upper, headers);
      if (direct) results = [direct];
      if (results.length === 0 && !q.includes('.')) {
        const ns = await chartMeta(`${upper}.NS`, headers);
        if (ns) results = [ns];
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
}
