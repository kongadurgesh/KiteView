import { fetchTrendlyneSwotCounts } from '../trendlyneSwot.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbols } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ swot: {} });
  }
  if (symbols.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 symbols per request' });
  }

  const entries = await Promise.all(
    symbols.map(async (symbol) => {
      const counts = await fetchTrendlyneSwotCounts(symbol);
      return [symbol, counts];
    }),
  );

  const swot = {};
  for (const [symbol, counts] of entries) {
    if (!counts) continue;
    swot[symbol] = {
      strengths: counts.strengths,
      weaknesses: counts.weaknesses,
      opportunities: counts.opportunities,
      threats: counts.threats,
    };
  }

  return res.status(200).json({ swot });
}
