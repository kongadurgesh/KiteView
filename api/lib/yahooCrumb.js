let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;

export async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
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

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function fetchYahooChart(symbol, range = '1y', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!response.ok) return null;
  return response.json();
}

export async function runConcurrent(items, limit, fn) {
  const out = {};
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      try {
        out[item] = await fn(item);
      } catch {
        out[item] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}
