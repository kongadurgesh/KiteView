export interface QuoteSnapshot {
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
}

export function parseQuoteSnapshot(quote: unknown): QuoteSnapshot | null {
  const r = (quote as { quoteResponse?: { result?: Record<string, unknown>[] } })?.quoteResponse?.result?.[0];
  if (!r || typeof r !== 'object') return null;
  const num = (k: string): number | null => {
    const v = r[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    return null;
  };
  return {
    change: num('regularMarketChange'),
    changePercent: num('regularMarketChangePercent'),
    previousClose: num('regularMarketPreviousClose'),
    dayHigh: num('regularMarketDayHigh'),
    dayLow: num('regularMarketDayLow'),
    volume: num('regularMarketVolume'),
  };
}
