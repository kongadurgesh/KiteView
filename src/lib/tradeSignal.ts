export type TradeSignal = 'BUY' | 'WAIT';

/** BUY when CMP is at or within tolerancePct above buy price (default 2%). */
export function getTradeSignal(
  cmp: number,
  buyPrice: number,
  tolerancePct = 2,
): TradeSignal {
  if (cmp <= 0 || buyPrice <= 0) return 'WAIT';
  return cmp <= buyPrice * (1 + tolerancePct / 100) ? 'BUY' : 'WAIT';
}
