import type { Candle, PatternMatch } from '../../types';

export type PatternBarRole = 'context' | 'base' | 'pattern' | 'breakout';

export interface PatternChartBar {
  candle: Candle;
  label: string;
  role: PatternBarRole;
}

/** Slice daily candles around the detected pattern for chart display. */
export function getPatternChartWindow(
  all: Candle[],
  match: PatternMatch,
  ctxBefore = 3,
  ctxAfter = 1,
): PatternChartBar[] {
  const i = all.findIndex(
    (c) => c.date === match.candle1.date && Math.abs(c.close - match.candle1.close) < 0.02,
  );

  if (i < 0) {
    return [
      { candle: match.candle1, label: 'Base', role: 'base' },
      { candle: match.candle2, label: 'Pattern', role: 'pattern' },
      { candle: match.candle3, label: 'Breakout', role: 'breakout' },
    ];
  }

  const start = Math.max(0, i - ctxBefore);
  const end = Math.min(all.length, i + 3 + ctxAfter);

  return all.slice(start, end).map((candle, j) => {
    const abs = start + j;
    if (abs === i) return { candle, label: 'Base', role: 'base' as const };
    if (abs === i + 1) return { candle, label: 'Pattern', role: 'pattern' as const };
    if (abs === i + 2) return { candle, label: 'Breakout', role: 'breakout' as const };
    return { candle, label: candle.date.slice(5), role: 'context' as const };
  });
}
