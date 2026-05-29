import { detectPattern, detectPatternInRange } from '../patternDetect.js';
import { fetchTrendlyneSwotCounts } from '../trendlyneSwot.js';

let cachedCrumb = null;
let cachedCookie = null;
let crumbExpiry = 0;
const profileCache = new Map();

async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie && Date.now() < crumbExpiry) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const cookieRes = await fetch('https://fc.yahoo.com/', {
    headers: { 'User-Agent': ua }, redirect: 'manual',
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

function parseChartResult(result) {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return null;
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null || v === 0) continue;
    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: parseFloat(o.toFixed(2)),
      high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)),
      close: parseFloat(c.toFixed(2)),
      volume: v,
    });
  }
  const meta = result.meta ?? {};
  return {
    candles,
    currentPrice: meta.regularMarketPrice ?? 0,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    shortName: meta.shortName || meta.symbol || '',
  };
}

async function fetchChartLive(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const parsed = parseChartResult(result);
  if (parsed) parsed.shortName = parsed.shortName || result.meta?.symbol || symbol;
  return parsed;
}

async function fetchChartRange(symbol, fromDate, toDate) {
  const period1 = Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) - 7 * 86400;
  const period2 = Math.floor(new Date(`${toDate}T23:59:59Z`).getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const parsed = parseChartResult(result);
  if (parsed) parsed.shortName = parsed.shortName || result.meta?.symbol || symbol;
  return parsed;
}

async function fetchATH(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=max&interval=1mo&includePrePost=false`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return 0;
    const data = await response.json();
    const highs = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.high ?? [];
    let ath = 0;
    for (const h of highs) { if (h != null && h > ath) ath = h; }
    return parseFloat(ath.toFixed(2));
  } catch { return 0; }
}

async function fetchSectorBatch(symbols) {
  if (symbols.length === 0) return {};
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    const data = await response.json();
    const result = {};
    for (const r of (data?.quoteResponse?.result ?? [])) {
      result[r.symbol] = {
        sector: r.sector ?? '',
        industry: r.industry ?? r.sector ?? '',
        marketCapCr: r.marketCap ? r.marketCap / 1e7 : 0,
      };
    }
    return result;
  } catch { return {}; }
}

async function fetchProfileSectorIndustry(symbol) {
  if (profileCache.has(symbol)) {
    return profileCache.get(symbol);
  }

  try {
    const { crumb, cookie } = await getYahooCrumb();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookie },
    });
    if (!response.ok) {
      const empty = { sector: '', industry: '' };
      profileCache.set(symbol, empty);
      return empty;
    }

    const data = await response.json();
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile ?? {};
    const normalized = {
      sector: typeof profile.sector === 'string' ? profile.sector : '',
      industry: typeof profile.industry === 'string' ? profile.industry : '',
    };
    profileCache.set(symbol, normalized);
    return normalized;
  } catch {
    const empty = { sector: '', industry: '' };
    profileCache.set(symbol, empty);
    return empty;
  }
}

async function fetchMissingProfiles(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) return {};

  const out = {};
  const results = await Promise.allSettled(symbols.map((symbol) => fetchProfileSectorIndustry(symbol)));
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const row = results[i];
    if (row.status === 'fulfilled') {
      out[symbol] = row.value;
    }
  }
  return out;
}

function validateDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'Invalid date format (use YYYY-MM-DD)';
  }
  if (from > to) return 'fromDate must be on or before toDate';
  const days = (to - from) / 86400000;
  if (days > 365) return 'Date range cannot exceed 365 days';
  return null;
}

function parseNumber(value) {
  if (value == null || value === '') return undefined;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function buildFilters(rawFilters) {
  const filters = rawFilters && typeof rawFilters === 'object' ? rawFilters : {};
  const marketCapMin = parseNumber(filters.marketCapCr?.min);
  const marketCapMax = parseNumber(filters.marketCapCr?.max);
  const priceMin = parseNumber(filters.priceRange?.min);
  const priceMax = parseNumber(filters.priceRange?.max);
  const patterns = normalizeStringArray(filters.patterns);
  const sectors = normalizeStringArray(filters.sectors).map((s) => s.toLowerCase());
  const industries = normalizeStringArray(filters.industries).map((s) => s.toLowerCase());

  return {
    patterns,
    marketCapMin,
    marketCapMax,
    priceMin,
    priceMax,
    sectors,
    industries,
  };
}

function passesNumericRange(value, min, max) {
  if (!Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function resolveCurrentPrice(chart) {
  const metaPrice = chart?.currentPrice;
  if (Number.isFinite(metaPrice) && metaPrice > 0) return metaPrice;
  const lastClose = chart?.candles?.[chart.candles.length - 1]?.close;
  if (Number.isFinite(lastClose) && lastClose > 0) return lastClose;
  return NaN;
}

function passesTagFilter(value, allowed) {
  if (!allowed || allowed.length === 0) return true;
  if (!value) return false;
  const normalized = String(value).toLowerCase();
  return allowed.some((pick) => normalized.includes(pick) || pick.includes(normalized));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols, mode, fromDate, toDate, filters: rawFilters } = req.body ?? {};
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const filters = buildFilters(rawFilters);

  if (
    filters.marketCapMin != null &&
    filters.marketCapMax != null &&
    filters.marketCapMin > filters.marketCapMax
  ) {
    return res.status(400).json({ error: 'Market cap min must be <= market cap max' });
  }

  if (
    filters.priceMin != null &&
    filters.priceMax != null &&
    filters.priceMin > filters.priceMax
  ) {
    return res.status(400).json({ error: 'Price min must be <= price max' });
  }

  const historical = mode === 'historical';
  if (historical) {
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required for historical scan' });
    }
    const err = validateDateRange(fromDate, toDate);
    if (err) return res.status(400).json({ error: err });
  }

  const CONCURRENCY = 25;
  const matches = [];

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const chart = historical
          ? await fetchChartRange(sym, fromDate, toDate)
          : await fetchChartLive(sym);
        if (!chart || chart.candles.length < 3) return null;

        const resolvedPrice = resolveCurrentPrice(chart);
        if (!Number.isFinite(resolvedPrice)) return null;

        if (!passesNumericRange(resolvedPrice, filters.priceMin, filters.priceMax)) {
          return null;
        }

        const match = historical
          ? detectPatternInRange(chart.candles, 0, fromDate, toDate, filters.patterns)
          : (() => {
              const lastDate = chart.candles[chart.candles.length - 1].date;
              const m = detectPattern(chart.candles, 0, filters.patterns);
              return m && m.candle3.date === lastDate ? m : null;
            })();

        if (!match) return null;
        return {
          symbol: sym,
          shortName: chart.shortName,
          marketCapCr: 0,
          currentPrice: resolvedPrice,
          match,
          fiftyTwoWeekHigh: chart.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: chart.fiftyTwoWeekLow,
          allTimeHigh: 0,
          sector: '',
          industry: '',
        };
      }),
    );
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value) matches.push(r.value);
    }
  }

  if (matches.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const matchSymbols = matches.map((m) => m.symbol);
  const sectorMap = await fetchSectorBatch(matchSymbols);
  const missingProfileSymbols = matchSymbols.filter((symbol) => {
    const info = sectorMap[symbol];
    return !info?.sector || !info?.industry;
  });
  const profileMap = await fetchMissingProfiles(missingProfileSymbols);

  const filtered = [];
  const hasMarketCapFilter = filters.marketCapMin != null || filters.marketCapMax != null;
  for (let j = 0; j < matches.length; j++) {
    const row = matches[j];
    const info = sectorMap[row.symbol];
    const profile = profileMap[row.symbol];
    const rawMarketCapCr = info?.marketCapCr;
    const resolvedMarketCapCr =
      Number.isFinite(rawMarketCapCr) && rawMarketCapCr > 0 ? rawMarketCapCr : NaN;

    row.sector = info?.sector || profile?.sector || '';
    row.industry = info?.industry || profile?.industry || row.sector || '';
    row.marketCapCr = Number.isFinite(resolvedMarketCapCr) ? resolvedMarketCapCr : 0;

    // If user asked for market-cap filtering, do not include rows with missing/unknown market cap.
    if (hasMarketCapFilter && !Number.isFinite(resolvedMarketCapCr)) {
      continue;
    }

    if (!passesNumericRange(resolvedMarketCapCr, filters.marketCapMin, filters.marketCapMax)) {
      continue;
    }

    const sectorOk = passesTagFilter(row.sector, filters.sectors);
    const industryOk = passesTagFilter(row.industry, filters.industries);
    if (!sectorOk || !industryOk) {
      continue;
    }

    filtered.push(row);
  }

  const athAndSwot = await Promise.all(
    filtered.map(async (row) => {
      const [ath, swot] = await Promise.all([fetchATH(row.symbol), fetchTrendlyneSwotCounts(row.symbol)]);
      return { symbol: row.symbol, ath, swot };
    }),
  );
  const bySymbol = new Map(athAndSwot.map((x) => [x.symbol, x]));

  for (const row of filtered) {
    const extra = bySymbol.get(row.symbol);
    row.allTimeHigh = extra?.ath ?? 0;
    row.swotStrengths = extra?.swot?.strengths ?? null;
    row.swotWeaknesses = extra?.swot?.weaknesses ?? null;
    row.swotOpportunities = extra?.swot?.opportunities ?? null;
    row.swotThreats = extra?.swot?.threats ?? null;
  }

  res.status(200).json({ results: filtered });
}