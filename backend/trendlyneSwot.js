/** Trendlyne SWOT widget fetch + parse (same source as Analysis SWOT embed). */

const SWOT_WIDGET_COLORS = 'posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E';
const SWOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { counts: object, expires: number }>} */
const swotCache = new Map();

export function nseSymbolToTrendlyneTicker(symbol) {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
}

function swotWidgetUrl(ticker) {
  return `https://trendlyne.com/web-widget/swot-widget/Poppins/${encodeURIComponent(ticker)}/?${SWOT_WIDGET_COLORS}`;
}

function parseSwotCounts(html) {
  const parseCard = (className) => {
    const re = new RegExp(
      `swot_cards\\s+${className}[^>]*>[\\s\\S]*?tag_number[^>]*>\\s*(\\d+)`,
      'i',
    );
    const m = html.match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    strengths: parseCard('strengths-fill'),
    weaknesses: parseCard('weakness-fill'),
    opportunities: parseCard('opportunity-fill'),
    threats: parseCard('threats-fill'),
  };
}

/** Filter: strengths count must be ≥ weaknesses count. */
export function passesSwotStrengthFilter(counts) {
  if (!counts) return false;
  const { strengths, weaknesses } = counts;
  if (strengths == null || weaknesses == null) return false;
  return strengths >= weaknesses;
}

export async function fetchTrendlyneSwotCounts(symbolOrTicker, { useCache = true } = {}) {
  const ticker = symbolOrTicker.includes('.')
    ? nseSymbolToTrendlyneTicker(symbolOrTicker)
    : symbolOrTicker.trim().toUpperCase();
  if (!ticker) return null;

  if (useCache) {
    const hit = swotCache.get(ticker);
    if (hit && Date.now() < hit.expires) return hit.counts;
  }

  try {
    const response = await fetch(swotWidgetUrl(ticker), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KiteView/1.0)' },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const counts = parseSwotCounts(html);
    if (counts.strengths == null || counts.weaknesses == null) return null;
    swotCache.set(ticker, { counts, expires: Date.now() + SWOT_CACHE_TTL_MS });
    return counts;
  } catch {
    return null;
  }
}
