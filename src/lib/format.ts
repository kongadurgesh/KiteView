export function fmtNumber(
  n: number,
  opts?: { min?: number; max?: number },
): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: opts?.min ?? 2,
    maximumFractionDigits: opts?.max ?? 2,
  });
}

export function fmtInr(n: number): string {
  return `₹${fmtNumber(n)}`;
}

export function fmtPct(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  const v = Math.abs(raw) <= 1 ? raw * 100 : raw;
  return `${v.toFixed(2)}%`;
}

export function fmtRatio(raw: number | null): string {
  if (raw == null || Number.isNaN(raw)) return '—';
  return raw.toFixed(2);
}

export function fmtMarketCap(raw: number | null): string {
  if (raw == null || raw <= 0) return '—';
  const cr = raw / 1e7;
  if (cr >= 10000) return `${(cr / 10000).toFixed(2)} L Cr`;
  return `${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

export function fmtMarketCapCr(cr: number): string {
  if (cr >= 100000) return `${(cr / 100000).toFixed(2)} L Cr`;
  return `${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
