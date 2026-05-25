import { getYahooCrumb } from '../yahooCrumb.js';
import { getHeatmapIndexDef } from '../heatmapIndexConfig.js';
import { loadBundledConstituents, resolveBundledConstituents } from '../bundledConstituents.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

async function fetchScreenerProxy({ region, limit }, creds) {
  const { crumb, cookie, ua } = creds;
  const minCap = region === 'us' ? 500_000_000 : 5_000_000_000;
  const operands = [
    { operator: 'eq', operands: ['region', region] },
    { operator: 'gt', operands: ['intradaymarketcap', minCap] },
  ];

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
  const bySymbol = new Map(stocks.map((s) => [typeof s === 'string' ? s : s.symbol, s]));
  const out = [];

  for (let i = 0; i < symbols.length; i += 50) {
    const batch = symbols.slice(i, i + 50).join(',');
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(batch)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': ua, Cookie: cookie },
    });
    const data = await response.json();
    for (const r of data?.quoteResponse?.result ?? []) {
      if (!r.symbol) continue;
      const base = bySymbol.get(r.symbol);
      out.push({
        symbol: r.symbol,
        shortName: r.shortName || r.longName || base?.shortName || r.symbol,
        marketCap: r.marketCap ?? base?.marketCap ?? 0,
      });
    }
  }

  if (out.length === 0) {
    return stocks.map((s) =>
      typeof s === 'string'
        ? { symbol: s, shortName: s, marketCap: 0 }
        : { symbol: s.symbol, shortName: s.shortName ?? s.symbol, marketCap: s.marketCap ?? 0 },
    );
  }
  return out;
}

async function resolveConstituents(def) {
  const creds = await getYahooCrumb();
  creds.ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const { source } = def;

  if (source.type === 'bundled') {
    const bundle = loadBundledConstituents(def.id) ?? (await resolveBundledConstituents(def.id));
    if (!bundle?.stocks?.length) {
      throw new Error(`No bundled constituents for ${def.id}`);
    }
    const enriched = await enrichWithQuotes(bundle.stocks, creds);
    return {
      indexId: def.id,
      label: bundle.label ?? def.label,
      group: bundle.group ?? def.group,
      source: bundle.source ?? 'bundled',
      asOf: bundle.asOf ?? null,
      isProxy: false,
      stocks: enriched,
      total: enriched.length,
    };
  }

  if (source.type === 'proxy') {
    const stocks = await fetchScreenerProxy(source, creds);
    return {
      indexId: def.id,
      label: def.label,
      group: def.group,
      source: 'proxy-screener',
      asOf: new Date().toISOString().slice(0, 10),
      isProxy: true,
      stocks,
      total: stocks.length,
    };
  }

  return null;
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
    const payload = await resolveConstituents(def);
    if (!payload) {
      return res.status(500).json({ error: 'Unsupported index source' });
    }
    cache.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch index constituents', details: err.message });
  }
}
