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

const FTS_METRICS = {
  quarterlyTotalRevenue: 'revenue',
  quarterlyPretaxIncome: 'pretaxIncome',
  quarterlyNetIncomeCommonStockholders: 'netIncomeCommon',
  quarterlyBasicEPS: 'basicEps',
};

function quarterLabel(endDate) {
  const d = new Date(`${endDate}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function hasAnyMetric(p) {
  return (
    p.revenue != null ||
    p.pretaxIncome != null ||
    p.netIncomeCommon != null ||
    p.basicEps != null
  );
}

function emptyPeriod(endDate) {
  return {
    endDate,
    revenue: null,
    pretaxIncome: null,
    netIncomeCommon: null,
    basicEps: null,
  };
}

/** Most recent → oldest (left-to-right: recent on the left, oldest on the right). */
export function sortQuarterlyPeriods(periods) {
  return [...periods].sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function finalizePeriods(byKey) {
  const periods = Object.values(byKey)
    .filter(hasAnyMetric)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 5)
    .map((p) => ({ ...p, label: quarterLabel(p.endDate) }));
  return periods;
}

function reportedRaw(entry) {
  if (entry == null) return null;
  const rv = entry.reportedValue;
  if (typeof rv === 'number' && !Number.isNaN(rv)) return rv;
  if (rv?.raw != null && !Number.isNaN(rv.raw)) return rv.raw;
  return null;
}

function periodDateKey(entry, ts) {
  if (entry?.asOfDate && typeof entry.asOfDate === 'string') {
    return entry.asOfDate.slice(0, 10);
  }
  if (typeof ts === 'number') {
    return new Date(ts * 1000).toISOString().split('T')[0];
  }
  return null;
}

/** Canonical keys for UI (accept legacy field names from older API). */
export function normalizeQuarterlyPeriod(p) {
  if (!p?.endDate) return null;
  return {
    endDate: p.endDate,
    label: p.label ?? quarterLabel(p.endDate),
    revenue: p.revenue ?? null,
    pretaxIncome: p.pretaxIncome ?? p.profitBeforeTax ?? p.incomeBeforeTax ?? null,
    netIncomeCommon:
      p.netIncomeCommon
      ?? p.netIncomeCommonStockholders
      ?? p.netIncomeApplicableToCommonShares
      ?? p.netProfit
      ?? p.netIncome
      ?? null,
    basicEps: p.basicEps ?? p.basicEPS ?? null,
  };
}

function mergePeriodsByDate(...sources) {
  const byDate = {};
  for (const { periods = [] } of sources) {
    for (const raw of periods) {
      const p = normalizeQuarterlyPeriod(raw);
      if (!p) continue;
      const prev = byDate[p.endDate];
      if (!prev) {
        byDate[p.endDate] = { ...p };
        continue;
      }
      byDate[p.endDate] = {
        endDate: p.endDate,
        label: p.label,
        revenue: p.revenue ?? prev.revenue,
        pretaxIncome: p.pretaxIncome ?? prev.pretaxIncome,
        netIncomeCommon: p.netIncomeCommon ?? prev.netIncomeCommon,
        basicEps: p.basicEps ?? prev.basicEps,
      };
    }
  }
  return finalizePeriods(byDate);
}

function parseFundamentalsTimeSeriesResponse(response) {
  const byDate = {};
  for (const result of response?.timeseries?.result ?? []) {
    if (!result.timestamp?.length) continue;
    for (const [dataKey, field] of Object.entries(FTS_METRICS)) {
      const series = result[dataKey];
      if (!Array.isArray(series)) continue;
      for (let i = 0; i < result.timestamp.length; i++) {
        const dateKey = periodDateKey(series[i], result.timestamp[i]);
        if (!dateKey) continue;
        if (!byDate[dateKey]) byDate[dateKey] = emptyPeriod(dateKey);
        const raw = reportedRaw(series[i]);
        if (typeof raw === 'number' && !Number.isNaN(raw)) byDate[dateKey][field] = raw;
      }
    }
  }
  return finalizePeriods(byDate);
}

async function fetchFundamentalsQuarterlyForRegion(symbol, cookie, region) {
  const period1 = Math.floor((Date.now() - 5 * 365 * 86400000) / 1000);
  const period2 = Math.floor(Date.now() / 1000) + 86400;
  const type =
    'quarterlyTotalRevenue,quarterlyPretaxIncome,quarterlyNetIncomeCommonStockholders,quarterlyBasicEPS';
  const url =
    `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&type=${encodeURIComponent(type)}&lang=en-US&region=${region}&module=financials`;
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];
  const data = await response.json();
  return parseFundamentalsTimeSeriesResponse(data);
}

function fundamentalsRegionsForSymbol(symbol) {
  const s = (symbol ?? '').toUpperCase();
  if (/\.(NS|BO)$/.test(s)) return ['IN', 'US'];
  if (s.endsWith('.L')) return ['GB', 'US'];
  if (/\.(DE|PA|AS|MI|SW)$/.test(s)) return ['DE', 'US', 'GB'];
  return ['US', 'IN', 'GB'];
}

export async function fetchFundamentalsQuarterly(symbol, cookie = null) {
  try {
    for (const region of fundamentalsRegionsForSymbol(symbol)) {
      const periods = await fetchFundamentalsQuarterlyForRegion(symbol, cookie, region);
      if (periods.length) return { periods };
    }
    return { periods: [] };
  } catch {
    return { periods: [] };
  }
}

export async function fetchIncomeStatementQuarterly(symbol, crumb, cookie) {
  try {
    const data = await fetchQuoteSummary(symbol, 'incomeStatementHistoryQuarterly', crumb, cookie);
    const mod = data?.quoteSummary?.result?.[0]?.incomeStatementHistoryQuarterly ?? {};
    return parseIncomeStatementQuarterly(mod);
  } catch {
    return { periods: [] };
  }
}

function isqPretaxIncome(row) {
  return rawNum(row.pretaxIncome) ?? rawNum(row.incomeBeforeTax) ?? null;
}

function isqNetIncomeCommon(row) {
  return (
    rawNum(row.netIncomeCommonStockholders)
    ?? rawNum(row.netIncomeApplicableToCommonShares)
    ?? rawNum(row.netIncome)
    ?? null
  );
}

function isqBasicEps(row) {
  return rawNum(row.basicEPS) ?? rawNum(row.basicEps) ?? null;
}

export function parseIncomeStatementQuarterly(module = {}) {
  const rows = module.incomeStatementHistory ?? [];
  const byDate = {};
  for (const row of rows) {
    const endDate = row.endDate?.fmt
      ?? (row.endDate?.raw
        ? new Date(row.endDate.raw * 1000).toISOString().split('T')[0]
        : null);
    if (!endDate || typeof endDate !== 'string') continue;
    const iso = endDate.length >= 10 ? endDate.slice(0, 10) : endDate;
    byDate[iso] = {
      endDate: iso,
      revenue: rawNum(row.totalRevenue),
      pretaxIncome: isqPretaxIncome(row),
      netIncomeCommon: isqNetIncomeCommon(row),
      basicEps: isqBasicEps(row),
    };
  }
  return { periods: finalizePeriods(byDate) };
}

export function normalizeQuarterlyResults(qr = { basis: 'unknown', periods: [] }) {
  return {
    basis: qr.basis ?? 'unknown',
    periods: sortQuarterlyPeriods(
      (qr.periods ?? []).map(normalizeQuarterlyPeriod).filter(Boolean),
    ),
  };
}

export function pickQuarterlyResults(consolidated, standalone) {
  const hasConsolidated = (consolidated?.periods?.length ?? 0) > 0;
  const hasStandalone = (standalone?.periods?.length ?? 0) > 0;
  const periods = mergePeriodsByDate(consolidated ?? { periods: [] }, standalone ?? { periods: [] });
  const basis = hasConsolidated
    ? 'consolidated'
    : hasStandalone
      ? 'standalone'
      : 'unknown';
  return normalizeQuarterlyResults({ basis, periods });
}

const emptyQuarterly = { basis: 'unknown', periods: [] };

export async function fetchQuarterlyResults(symbol, crumb, cookie) {
  const [consolidated, standalone] = await Promise.all([
    fetchFundamentalsQuarterly(symbol, cookie),
    fetchIncomeStatementQuarterly(symbol, crumb, cookie),
  ]);
  return pickQuarterlyResults(consolidated, standalone);
}

/** Profile, financials, recommendations, news, and quarterly results for lookup-bundle. */
export async function fetchAnalysisExtras(symbol, getYahooCrumb) {
  const emptyQuarterly = { basis: 'unknown', periods: [] };
  const empty = {
    profile: parseProfile({}),
    financials: parseFinancial({}),
    recommendations: parseRecommendations({}),
    news: [],
    quarterlyResults: emptyQuarterly,
  };

  let crumb;
  let cookie;
  try {
    ({ crumb, cookie } = await getYahooCrumb());
  } catch {
    const fts = await fetchFundamentalsQuarterly(symbol, null);
    empty.quarterlyResults = pickQuarterlyResults(fts, { periods: [] });
    return empty;
  }

  const [quarterlySettled, summarySettled, newsSettled] = await Promise.allSettled([
    fetchQuarterlyResults(symbol, crumb, cookie),
    fetchQuoteSummary(symbol, 'assetProfile,financialData,recommendationTrend', crumb, cookie),
    fetchQuoteSummary(symbol, 'news', crumb, cookie),
  ]);

  const quarterlyResults = normalizeQuarterlyResults(
    quarterlySettled.status === 'fulfilled' ? quarterlySettled.value : emptyQuarterly,
  );

  const summary = summarySettled.status === 'fulfilled' ? summarySettled.value : null;
  const newsData = newsSettled.status === 'fulfilled' ? newsSettled.value : null;
  const result = summary?.quoteSummary?.result?.[0] ?? {};
  const newsResult = newsData?.quoteSummary?.result?.[0] ?? {};

  return {
    profile: parseProfile(result.assetProfile ?? {}),
    financials: parseFinancial(result.financialData ?? {}),
    recommendations: parseRecommendations(result.recommendationTrend ?? {}),
    news: parseNews(newsResult ?? {}),
    quarterlyResults,
  };
}
