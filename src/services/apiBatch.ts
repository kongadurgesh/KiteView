const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

import type {
  AnalysisProfile,
  AnalysisNewsItem,
  AnalysisRecommendations,
  FinancialHighlights,
  QuarterlyResults,
} from '../types/analysisExtras';
import type { WatchlistSnapshot } from '../types/watchlist';

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
  strengths: number;
  weaknesses: number;
}

export async function fetchSwotBatch(symbols: string[]): Promise<Record<string, SwotCounts>> {
  if (symbols.length === 0) return {};
  const data = await postJson<{ swot: Record<string, SwotCounts> }>('/api/swot-batch', { symbols });
  return data.swot ?? {};
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
