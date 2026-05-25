import { getYahooCrumb } from '../yahooCrumb.js';
import { getHeatmapIndexDef } from '../heatmapIndexConfig.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

function dedupeSymbols(symbols) {
  const seen = new Set();
  const out = [];
  for (const s of symbols) {
    const sym = s?.trim();
    if (!sym || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out;
}

async function fetchComponents(symbol, { crumb, cookie, ua }) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=components&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': ua, Cookie: cookie },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return dedupeSymbols(data?.quoteSummary?.result?.[0]?.components?.components ?? []);
}

async function fetchScreenerStocks(
  { region, sector, limit, nsOnly },
  { crumb, cookie, ua },
) {
  const minCap = region === 'us' ? 500_000_000 : 5_000_000_000;
  const operands = [
    { operator: 'eq', operands: ['region', region] },
    { operator: 'gt', operands: ['intradaymarketcap', minCap] },
  ];
  if (sector) {
    operands.push({ operator: 'eq', operands: ['sector', sector] });
  }

  const stocks = [];
  let offset = 0;
  const pageSize = Math.min(250, limit);

  while (stocks.length < limit) {
    const url = `https://query2.finance.yahoo.com/v1/finance/screener?crumb=${encodeURIComponent(crumb)}`;
    const body = {
      offset,
      size: pageSize,
      sortField: 'intradaymarketcap',
      sortType: 'DESC',
      quoteType: 'EQUITY',
      query: { operator: 'AND', operands },
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
    if (quotes.length === 0) break;

    for (const q of quotes) {
      if (!q.symbol) continue;
      if (nsOnly && !q.symbol.endsWith('.NS')) continue;
      if (q.symbol.endsWith('.BO')) continue;
      stocks.push({
        symbol: q.symbol,
        shortName: q.shortName || q.longName || q.symbol,
        marketCap: q.marketCap ?? 0,
      });
      if (stocks.length >= limit) break;
    }

    const total = data?.finance?.result?.[0]?.total ?? 0;
    offset += pageSize;
    if (offset >= total) break;
  }

  return stocks;
}

async function enrichWithQuotes(stocks, creds) {
  if (stocks.length === 0) return [];
  const { crumb, cookie, ua } = creds;
  const symbols = stocks.map((s) => (typeof s === 'string' ? s : s.symbol));
  const out = [];
  for (let i = 0; i < symbols.length; i += 50) {
    const batch = symbols.slice(i, i + 50).join(',');
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': ua, Cookie: cookie },
    });
    const data = await response.json();
    const rows = data?.quoteResponse?.result ?? [];
    for (const r of rows) {
      if (!r.symbol) continue;
      out.push({
        symbol: r.symbol,
        shortName: r.shortName || r.longName || r.symbol,
        marketCap: r.marketCap ?? 0,
      });
    }
  }
  return out;
}

async function resolveConstituents(def, nseSliceStocks) {
  const creds = await getYahooCrumb();
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  creds.ua = ua;

  const { source } = def;

  if (source.type === 'slice') {
    const end = source.end === Infinity ? nseSliceStocks.length : source.end;
    return nseSliceStocks.slice(source.start, Math.min(end, nseSliceStocks.length));
  }

  if (source.type === 'components') {
    let symbols = await fetchComponents(source.symbol, creds);
    if (symbols.length < 8 && source.fallbackSlice && nseSliceStocks.length > 0) {
      const [start, end] = source.fallbackSlice;
      return nseSliceStocks.slice(start, Math.min(end, nseSliceStocks.length));
    }
    if (symbols.length === 0) return [];
    const partial = symbols.map((symbol) => ({ symbol, shortName: symbol, marketCap: 0 }));
    return enrichWithQuotes(partial, creds);
  }

  if (source.type === 'screener') {
    return fetchScreenerStocks(source, creds);
  }

  return [];
}

export default async function handler(req, res) {
  const indexId = req.query.indexId ?? req.query.index;
  if (!indexId || typeof indexId !== 'string') {
    return res.status(400).json({ error: 'indexId query parameter required' });
  }

  const def = getHeatmapIndexDef(indexId);
  if (!def) {
    return res.status(404).json({ error: 'Unknown heatmap index' });
  }

  if (def.source.type === 'slice') {
    return res.status(400).json({
      error: 'Slice indices are resolved client-side from the NSE screener list',
      source: 'slice',
    });
  }

  const cacheKey = indexId;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expires) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(hit.data);
  }

  try {
    const stocks = await resolveConstituents(def, []);
    const payload = {
      indexId: def.id,
      label: def.label,
      group: def.group,
      stocks,
      total: stocks.length,
    };
    cache.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch index constituents', details: err.message });
  }
}
