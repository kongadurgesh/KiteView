import { API_BASE } from '../lib/apiBase';

import type {
  AnalysisProfile,
  AnalysisNewsItem,
  AnalysisRecommendations,
  FinancialHighlights,
  QuarterlyResults,
  QuarterlyResultsRaw,
} from '../types/analysisExtras';
import type { WatchlistSnapshot } from '../types/watchlist';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Batch request failed (HTTP ${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchChartBatch(
  symbols: string[],
  range = '1y',
  interval = '1d',
): Promise<Record<string, unknown>> {
  if (symbols.length === 0) return {};
  const data = await postJson<{ charts: Record<string, unknown> }>('/api/chart-batch', {
    symbols,
    range,
    interval,
  });
  return data.charts ?? {};
}

export async function fetchStatsBatch<T>(symbols: string[]): Promise<Record<string, T>> {
  if (symbols.length === 0) return {};
  const data = await postJson<{ stats: Record<string, T> }>('/api/stats-batch', { symbols });
  return data.stats ?? {};
}

export async function fetchWatchlistSnapshot(
  symbols: string[],
): Promise<Record<string, WatchlistSnapshot>> {
  if (symbols.length === 0) return {};
  const data = await postJson<{ snapshots: Record<string, WatchlistSnapshot> }>(
    '/api/watchlist-snapshot',
    { symbols },
  );
  return data.snapshots ?? {};
}

export interface SwotCounts {
  strengths: number | null;
  weaknesses: number | null;
  opportunities: number | null;
  threats: number | null;
}

const SWOT_WIDGET_COLORS = 'posCol=00A25B&primaryCol=006AFF&negCol=EB3B00&neuCol=F7941E';
const swotClientCache = new Map<string, SwotCounts>();

function normalizeSwotCount(value: unknown): number | null {
  const parsed = Number.parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSwotHtml(html: string): SwotCounts | null {
  const extractCardValue = (className: string): number | null => {
    const cardRe = new RegExp(`<[^>]+class=["']([^"']*${className}[^"']*)["'][^>]*>`, 'i');
    const cardMatch = html.match(cardRe);
    if (!cardMatch) return null;

    const cardStart = (cardMatch.index ?? 0) + cardMatch[0].length;
    const cardEnd = html.indexOf('</div>', cardStart);
    if (cardEnd === -1) return null;

    const cardHtml = html.slice(cardStart, cardEnd);
    const tagNumberMatch = cardHtml.match(/tag_number[^>]*>[\s\S]*?([0-9]+(?:\.[0-9]+)?)/i);
    if (tagNumberMatch) return normalizeSwotCount(tagNumberMatch[1]);

    const numberMatch = cardHtml.match(/([0-9]+(?:\.[0-9]+)?)/);
    return numberMatch ? normalizeSwotCount(numberMatch[1]) : null;
  };

  const strengths = extractCardValue('strengths-fill');
  const weaknesses = extractCardValue('weakness-fill');
  const opportunities = extractCardValue('opportunity-fill');
  const threats = extractCardValue('threats-fill');

  if (strengths == null || weaknesses == null) return null;
  return { strengths, weaknesses, opportunities: opportunities ?? null, threats: threats ?? null };
}

async function fetchSwotBatchClient(symbols: string[]): Promise<Record<string, SwotCounts>> {
  if (typeof window === 'undefined') return {};

  const output: Record<string, SwotCounts> = {};
  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) continue;
    const cached = swotClientCache.get(normalized);
    if (cached) {
      output[symbol] = cached;
      continue;
    }

    const ticker = normalized.replace(/\.(NS|BO)$/i, '');
    const urls = [
      `https://trendlyne.com/web-widget/swot-widget/Poppins/${encodeURIComponent(ticker)}/?${SWOT_WIDGET_COLORS}`,
      `https://www.trendlyne.com/web-widget/swot-widget/Poppins/${encodeURIComponent(ticker)}/?${SWOT_WIDGET_COLORS}`,
    ];

    let lastError: unknown;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KiteView/1.0)',
            Referer: 'https://www.google.com/',
          },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const counts = parseSwotHtml(html);
        if (counts) {
          swotClientCache.set(normalized, counts);
          output[symbol] = counts;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError && !output[symbol]) {
      console.warn(`[swot] client fallback failed for ${symbol}`, lastError);
    }
  }
  return output;
}

export async function fetchSwotBatch(symbols: string[]): Promise<Record<string, SwotCounts>> {
  if (symbols.length === 0) return {};

  try {
    const data = await postJson<{ swot: Record<string, SwotCounts> }>('/api/swot-batch', { symbols });
    const serverSwot = data.swot ?? {};
    const output: Record<string, SwotCounts> = {};

    for (const symbol of symbols) {
      const counts = serverSwot[symbol];
      if (counts?.strengths != null && counts?.weaknesses != null) {
        output[symbol] = counts;
      }
    }

    const missing = symbols.filter((symbol) => !output[symbol]);
    if (missing.length > 0) {
      const clientSwot = await fetchSwotBatchClient(missing);
      Object.assign(output, clientSwot);
    }
    return output;
  } catch {
    return fetchSwotBatchClient(symbols);
  }
}

export interface AnalysisBundleResponse {
  chart1y: unknown;
  chartMax: unknown;
  quote: unknown;
  profile: AnalysisProfile;
  financials: FinancialHighlights;
  recommendations: AnalysisRecommendations;
  news: AnalysisNewsItem[];
  quarterlyResults: QuarterlyResults;
  quarterlyResultsRaw?: QuarterlyResultsRaw;
}

/** @deprecated Use AnalysisBundleResponse */
export type LookupBundleResponse = AnalysisBundleResponse;

export async function fetchAnalysisBundle(symbol: string): Promise<AnalysisBundleResponse> {
  const url = `${API_BASE}/api/lookup-bundle?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analysis bundle failed (HTTP ${res.status})`);
  return res.json() as Promise<AnalysisBundleResponse>;
}

export const fetchLookupBundle = fetchAnalysisBundle;
