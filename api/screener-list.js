let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': ua },
    redirect: 'manual',
  });
  const setCookie = cookieRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': ua, Cookie: cookie },
  });
  const crumb = await crumbRes.text();

  cachedCrumb = crumb;
  cachedCookie = cookie;
  crumbExpiry = Date.now() + 10 * 60 * 1000;
  return { crumb, cookie };
}

export default async function handler(req, res) {
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const minMarketCap = 10_000_000_000;

    const allSymbols = [];
    let offset = 0;
    const size = 250;

    while (true) {
      const url = `https://query2.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(crumb)}`;
      const body = {
        offset,
        size,
        sortField: 'intradaymarketcap',
        sortType: 'DESC',
        quoteType: 'EQUITY',
        query: {
          operator: 'AND',
          operands: [
            { operator: 'eq', operands: ['region', 'in'] },
            { operator: 'gt', operands: ['intradaymarketcap', minMarketCap] },
          ],
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          Cookie: cookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      const quotes = data?.finance?.result?.[0]?.quotes ?? [];

      for (const q of quotes) {
        if (q.symbol?.endsWith('.BO')) continue;
        allSymbols.push({
          symbol: q.symbol,
          shortName: q.shortName || q.longName || q.symbol,
          marketCap: q.marketCap ?? 0,
        });
      }

      const total = data?.finance?.result?.[0]?.total ?? 0;
      offset += size;
      if (offset >= total || quotes.length === 0) break;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ stocks: allSymbols, total: allSymbols.length });
  } catch (err) {
    res.status(500).json({ error: 'Screener list failed', details: err.message });
  }
}
