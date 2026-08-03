/** Trendlyne SWOT widget fetch + parse (same source as Analysis SWOT embed). */

const SWOT_WIDGET_COLORS = 'posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E';
const SWOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { counts: object, expires: number }>} */
const swotCache = new Map();

export function nseSymbolToTrendlyneTicker(symbol) {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
}

function swotWidgetUrls(ticker) {
  const encoded = encodeURIComponent(ticker);
  return [
    `https://trendlyne.com/web-widget/swot-widget/Poppins/${encoded}/?${SWOT_WIDGET_COLORS}`,
    `https://www.trendlyne.com/web-widget/swot-widget/Poppins/${encoded}/?${SWOT_WIDGET_COLORS}`,
  ];
}

function parseSwotCounts(html) {
  const normalizeCount = (value) => {
    const parsed = Number.parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const findCardValue = (className) => {
    const cardRe = new RegExp(`<[^>]+class=["']([^"']*${className}[^"']*)["'][^>]*>`, 'i');
    const cardMatch = html.match(cardRe);
    if (!cardMatch) return null;

    const cardStart = cardMatch.index + cardMatch[0].length;
    const cardEnd = html.indexOf('</div>', cardStart);
    if (cardEnd === -1) return null;

    const cardHtml = html.slice(cardStart, cardEnd);
    const tagNumberMatch = cardHtml.match(/tag_number[^>]*>[\s\S]*?([0-9]+(?:\.[0-9]+)?)/i);
    if (tagNumberMatch) return normalizeCount(tagNumberMatch[1]);

    const numberMatch = cardHtml.match(/([0-9]+(?:\.[0-9]+)?)/);
    return numberMatch ? normalizeCount(numberMatch[1]) : null;
  };

  return {
    strengths: findCardValue('strengths-fill'),
    weaknesses: findCardValue('weakness-fill'),
    opportunities: findCardValue('opportunity-fill'),
    threats: findCardValue('threats-fill'),
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
    let lastError = null;
    for (const url of swotWidgetUrls(ticker)) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KiteView/1.0)',
            Referer: 'https://www.google.com/',
          },
        });
        if (!response.ok) {
          lastError = new Error(`SWOT request failed with ${response.status}`);
          continue;
        }
        const html = await response.text();
        const counts = parseSwotCounts(html);
        if (counts.strengths == null || counts.weaknesses == null) {
          lastError = new Error('SWOT HTML did not contain card counts');
          continue;
        }
        swotCache.set(ticker, { counts, expires: Date.now() + SWOT_CACHE_TTL_MS });
        return counts;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) {
      console.warn(`[swot] ${ticker} failed`, lastError.message);
    }
    return null;
  } catch (err) {
    console.warn(`[swot] ${ticker} unexpected failure`, err?.message || err);
    return null;
  }
}
