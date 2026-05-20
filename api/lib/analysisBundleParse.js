/** Parse Yahoo quoteSummary modules into a compact analysis bundle payload. */

function rawNum(v) {
  if (v == null) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'object' && v.raw != null) return v.raw;
  return null;
}

export function parseProfile(asset = {}) {
  return {
    sector: asset.sector ?? '',
    industry: asset.industry ?? '',
    longBusinessSummary: asset.longBusinessSummary ?? '',
    website: asset.website ?? '',
    fullTimeEmployees: rawNum(asset.fullTimeEmployees),
  };
}

export function parseFinancial(fd = {}) {
  return {
    revenueGrowth: rawNum(fd.revenueGrowth),
    profitMargins: rawNum(fd.profitMargins),
    operatingMargins: rawNum(fd.operatingMargins),
    returnOnEquity: rawNum(fd.returnOnEquity),
    debtToEquity: rawNum(fd.debtToEquity),
  };
}

export function parseRecommendations(trend = {}) {
  const t = trend.trend?.[0] ?? trend;
  return {
    strongBuy: t.strongBuy?.raw ?? t.strongBuy ?? 0,
    buy: t.buy?.raw ?? t.buy ?? 0,
    hold: t.hold?.raw ?? t.hold ?? 0,
    sell: t.sell?.raw ?? t.sell ?? 0,
    strongSell: t.strongSell?.raw ?? t.strongSell ?? 0,
  };
}

export function parseNews(newsModule = {}) {
  const items = newsModule.news ?? [];
  return items.slice(0, 6).map((n) => ({
    title: n.title ?? '',
    link: n.link ?? '',
    publisher: n.publisher ?? '',
    publishedAt: n.providerPublishTime
      ? new Date(n.providerPublishTime * 1000).toISOString().split('T')[0]
      : null,
  })).filter((n) => n.title);
}

export async function fetchQuoteSummary(symbol, modules, crumb, cookie) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
  });
  if (!response.ok) return null;
  return response.json();
}
