import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3006;

app.use(cors());

app.get('/api/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const range = req.query.range || '1y';
  const interval = req.query.interval || '1d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from Yahoo Finance', details: err.message });
  }
});

app.get('/api/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail,price`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quote data', details: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  const headers = { 'User-Agent': 'Mozilla/5.0' };

  async function searchYahoo(query) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    return (data.quotes || [])
      .filter((item) => item.exchange === 'NSI' || item.exchange === 'BSE')
      .map((item) => ({ symbol: item.symbol, shortname: item.shortname, exchange: item.exchange }));
  }

  try {
    let results = await searchYahoo(q);

    // If no Indian results, also try the symbol directly with .NS suffix
    if (results.length === 0) {
      const directSymbol = q.includes('.') ? q : `${q}.NS`;
      const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(directSymbol)}?range=1d&interval=1d`;
      const chartRes = await fetch(chartUrl, { headers });
      const chartData = await chartRes.json();
      const meta = chartData?.chart?.result?.[0]?.meta;
      if (meta) {
        results.push({ symbol: meta.symbol, shortname: meta.shortName || meta.symbol, exchange: meta.exchangeName });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
