const CONCURRENCY = 30;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function fetchChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  return response.json();
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbols, range = '1y', interval = '1d' } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ charts: {} });
  }

  const charts = {};
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const data = await fetchChart(sym, range, interval);
        return { sym, data };
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data) {
        charts[r.value.sym] = r.value.data;
      }
    }
  }

  return res.status(200).json({ charts });
}
