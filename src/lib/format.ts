export function fmtNumber(
  n: number,
  opts?: { min?: number; max?: number },
): string {
  const max = opts?.max ?? 2;
  const min = opts?.min ?? (opts?.max !== undefined ? max : 2);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: Math.min(min, max),
    maximumFractionDigits: max,
  });
}

export function fmtInr(n: number): string {
  return `₹${fmtNumber(n)}`;
}

/** Compact INR for tight UI (e.g. heatmap tiles). */
export function fmtInrCompact(n: number): string {
  if (n >= 10000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Ratios from fundamentals (0.15 → 15%); values already ≥1 or ≤-1 stay as percent points. */
export function fmtPct(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = Math.abs(raw) <= 1 ? raw * 100 : raw;
  return `${v.toFixed(2)}%`;
}

/** Yahoo quote % fields (e.g. regularMarketChangePercent) — already in percent units. */
export function fmtQuotePct(raw: number | null, decimals = 2): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  return fmtSignedPct(raw, decimals);
}

export function fmtSignedPct(pct: number, decimals = 2): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
}

/** % distance of current vs a reference price (screener distance columns). */
export function fmtDistPct(current: number, target: number): string {
  if (!target || !current) return '—';
  return fmtSignedPct(((current - target) / target) * 100, 1);
}

export function fmtRatio(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  return raw.toFixed(2);
}

export function fmtMarketCapCr(cr: number): string {
  if (!cr || cr <= 0) return '—';
  if (cr >= 100_000) return `${(cr / 100_000).toFixed(2)} L Cr`;
  return `${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

export function fmtMarketCapIntl(raw: number): string {
  if (raw >= 1e12) return `$${(raw / 1e12).toFixed(2)}T`;
  if (raw >= 1e9) return `$${(raw / 1e9).toFixed(2)}B`;
  if (raw >= 1e6) return `$${(raw / 1e6).toFixed(2)}M`;
  return `$${raw.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function fmtMarketCap(raw: number | null, indian = true): string {
  if (raw == null || raw <= 0) return '—';
  if (!indian) return fmtMarketCapIntl(raw);
  return fmtMarketCapCr(raw / 1e7);
}

/** Price with currency inferred from Yahoo symbol suffix. */
export function fmtMoney(n: number, symbol: string): string {
  if (!n || n <= 0) return '—';
  if (/\.(NS|BO)$/i.test(symbol)) return fmtInr(n);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Per-share amounts (e.g. Basic EPS from Yahoo fundamentals). */
export function fmtEps(raw: number | null, indian = true): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = raw.toLocaleString(indian ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return indian ? v : `$${v}`;
}

/** Large INR amounts (Yahoo fundamentals raw values) → Cr / L. */
export function fmtFinancialInr(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const abs = Math.abs(raw);
  if (abs >= 1e7) return `₹${(raw / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(raw / 1e5).toFixed(2)} L`;
  return `₹${raw.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Large USD amounts (Yahoo fundamentals raw values) → K / M / B / T. */
export function fmtFinancialUsd(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const sign = raw < 0 ? '-' : '';
  const abs = Math.abs(raw);
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(raw);
}

/** Quarterly P&L line items — INR (Cr/L) for NSE/BSE, USD otherwise. */
export function fmtFinancialAmount(raw: number | null, indian = true): string {
  return indian ? fmtFinancialInr(raw) : fmtFinancialUsd(raw);
}

/** Share volume: raw count → L / Cr style labels. */
export function fmtVolume(v: number | null): string {
  if (v == null || v <= 0) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
