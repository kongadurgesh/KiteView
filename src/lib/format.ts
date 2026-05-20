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

export function fmtPct(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = Math.abs(raw) <= 1 ? raw * 100 : raw;
  return `${v.toFixed(2)}%`;
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

export function fmtMarketCap(raw: number | null): string {
  if (raw == null || raw <= 0) return '—';
  return fmtMarketCapCr(raw / 1e7);
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
