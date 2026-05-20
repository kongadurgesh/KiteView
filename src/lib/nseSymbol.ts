/** Normalize user or search input to Yahoo NSE symbol (uppercase, `.NS` suffix). */
export function normalizeNseSymbol(sym: string): string {
  const t = sym.trim().toUpperCase();
  if (!t) return t;
  if (t.includes('.')) return t;
  return `${t}.NS`;
}

/** NSE/BSE Yahoo symbol → Trendlyne ticker (e.g. `TCS.NS` → `TCS`). */
export function nseSymbolToTrendlyneTicker(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
}
