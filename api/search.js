export default async function handler(req, res) {
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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
}
