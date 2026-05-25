import { API_BASE } from '../lib/apiBase';

export async function resolveYahooSymbol(input: string): Promise<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const res = await fetch(`${API_BASE}/api/resolve-symbol?q=${encodeURIComponent(trimmed)}`);
  if (res.ok) {
    const data = (await res.json()) as { symbol?: string };
    return data.symbol?.trim() || null;
  }
  if (res.status === 404) return null;
  throw new Error('Could not resolve symbol');
}
