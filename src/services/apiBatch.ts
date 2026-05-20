const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PROXY_BASE}${path}`, {
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
import type {
  AnalysisProfile,
  AnalysisNewsItem,
  AnalysisRecommendations,
  FinancialHighlights,
} from '../types/analysisExtras';

export interface AnalysisBundleResponse {
  chart1y: unknown;
  chartMax: unknown;
  quote: unknown;
  profile: AnalysisProfile;
  financials: FinancialHighlights;
  recommendations: AnalysisRecommendations;
  news: AnalysisNewsItem[];
}

/** @deprecated Use AnalysisBundleResponse */
export type LookupBundleResponse = AnalysisBundleResponse;

export async function fetchAnalysisBundle(symbol: string): Promise<AnalysisBundleResponse> {
  const url = `${PROXY_BASE}/api/lookup-bundle?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Analysis bundle failed (HTTP ${res.status})`);
  return res.json() as Promise<AnalysisBundleResponse>;
}

export const fetchLookupBundle = fetchAnalysisBundle;
