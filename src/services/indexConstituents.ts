import { API_BASE } from '../lib/apiBase';
import type { ScreenerStock } from '../utils/screener';

export interface IndexConstituentsResponse {
  indexId: string;
  label: string;
  group: string;
  stocks: ScreenerStock[];
  total: number;
  source?: string;
  asOf?: string | null;
  isProxy?: boolean;
}

export async function fetchIndexConstituents(indexId: string): Promise<IndexConstituentsResponse> {
  const url = `${API_BASE}/api/index-constituents?indexId=${encodeURIComponent(indexId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to load constituents (${res.status})`);
  }
  const data = (await res.json()) as IndexConstituentsResponse;
  return {
    ...data,
    stocks: data.stocks ?? [],
    total: data.total ?? data.stocks?.length ?? 0,
  };
}
