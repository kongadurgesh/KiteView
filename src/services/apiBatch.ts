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
export interface LookupBundleResponse {
  chart1y: unknown;
  chartMax: unknown;
  quote: unknown;
  profile: { sector: string; industry: string };
}

export async function fetchLookupBundle(symbol: string): Promise<LookupBundleResponse> {
  const url = `${PROXY_BASE}/api/lookup-bundle?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lookup bundle failed (HTTP ${res.status})`);
  return res.json() as Promise<LookupBundleResponse>;
}
