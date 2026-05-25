/** Yahoo symbol helpers for search and analysis (all exchanges). */

export function isIndianSymbol(symbol) {
  return /\.(NS|BO)$/i.test(symbol?.trim() ?? '');
}

export function normalizeYahooSymbolInput(sym) {
  const t = sym.trim().toUpperCase();
  if (!t) return t;
  if (t.startsWith('^') || t.includes('.')) return t;
  return t;
}

export async function chartMeta(symbol, headers) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.symbol) return null;
  return {
    symbol: meta.symbol,
    shortname: meta.shortName || meta.longName || meta.symbol,
    exchange: meta.exchangeName || meta.fullExchangeName || '',
  };
}

export async function searchYahooEquities(query, headers, { limit = 12 } = {}) {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0&listsCount=0`;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.quotes || [])
    .filter((item) => {
      if (!item.symbol) return false;
      const qt = (item.quoteType || '').toUpperCase();
      if (qt && qt !== 'EQUITY') return false;
      return true;
    })
    .map((item) => ({
      symbol: item.symbol,
      shortname: item.shortname || item.longname || item.symbol,
      exchange: item.exchange || item.exchDisp || '',
    }));
}

export async function resolveYahooSymbol(query, headers) {
  const raw = query?.trim();
  if (!raw) return null;

  const upper = normalizeYahooSymbolInput(raw);

  const results = await searchYahooEquities(raw, headers, { limit: 15 });
  if (results.length > 0) {
    const exact = results.find((r) => r.symbol.toUpperCase() === upper);
    if (exact) return exact.symbol;
    if (results.length === 1) return results[0].symbol;
    const starts = results.filter((r) => r.symbol.toUpperCase().startsWith(upper));
    if (starts.length === 1) return starts[0].symbol;
  }

  const direct = await chartMeta(upper, headers);
  if (direct) return direct.symbol;

  if (!raw.includes('.')) {
    const ns = await chartMeta(`${upper}.NS`, headers);
    if (ns) return ns.symbol;
  }

  return null;
}
