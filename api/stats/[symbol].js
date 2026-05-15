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
  const { symbol } = req.query;
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,summaryDetail,price&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0] ?? {};
    const ks = result.defaultKeyStatistics ?? {};
    const sd = result.summaryDetail ?? {};
    const pr = result.price ?? {};
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      pe: sd.trailingPE?.raw ?? null,
      forwardPE: sd.forwardPE?.raw ?? null,
      pb: ks.priceToBook?.raw ?? null,
      beta: ks.beta?.raw ?? null,
      fiftyTwoWeekChange: ks.fiftyTwoWeekChange?.raw ?? null,
      marketCap: pr.marketCap?.raw ?? null,
      shortName: pr.shortName ?? symbol,
      regularMarketPrice: pr.regularMarketPrice?.raw ?? null,
      sector: pr.sector ?? '',
    });
  } catch {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ pe: null, pb: null, beta: null, forwardPE: null, fiftyTwoWeekChange: null, marketCap: null, shortName: symbol, regularMarketPrice: null, sector: '' });
  }
}
