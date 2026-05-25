/** NSE/BSE Yahoo symbol (`.NS` / `.BO`). */
export function isIndianSymbol(symbol: string): boolean {
  return /\.(NS|BO)$/i.test(symbol?.trim() ?? '');
}

/** Normalize user or search input to Yahoo NSE symbol (uppercase, `.NS` suffix). */
export function normalizeNseSymbol(sym: string): string {
  const t = sym.trim().toUpperCase();
  if (!t) return t;
  if (t.includes('.')) return t;
  return `${t}.NS`;
}

/** Pass-through for symbols that already include exchange suffix or index prefix. */
export function normalizeYahooSymbolInput(sym: string): string {
  const t = sym.trim().toUpperCase();
  if (!t) return t;
  if (t.startsWith('^') || t.includes('.')) return t;
  return t;
}

/** NSE/BSE Yahoo symbol → Trendlyne ticker (e.g. `TCS.NS` → `TCS`). */
export function nseSymbolToTrendlyneTicker(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
}
