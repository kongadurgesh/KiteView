import { useMemo, useState } from 'react';
import type { PatternChartBar } from '../patternChartCandles';
import { fmtNumber } from '../../../lib/format';

const W = 640;
const H = 300;
const PAD = { top: 16, right: 12, bottom: 44, left: 52 };

interface PatternCandleChartProps {
  bars: PatternChartBar[];
  buyPrice: number;
  buyTriggerPrice: number;
}

export function PatternCandleChart({ bars, buyPrice, buyTriggerPrice }: PatternCandleChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (bars.length === 0) return null;

    const prices = bars.flatMap((b) => [b.candle.high, b.candle.low, buyPrice, buyTriggerPrice]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pad = (maxP - minP) * 0.08 || maxP * 0.02;
    const yMin = minP - pad;
    const yMax = maxP + pad;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const slot = plotW / bars.length;
    const bodyW = Math.min(28, slot * 0.55);

    const y = (price: number) => PAD.top + ((yMax - price) / (yMax - yMin)) * plotH;
    const xCenter = (i: number) => PAD.left + slot * i + slot / 2;

    return { yMin, yMax, plotH, slot, bodyW, y, xCenter };
  }, [bars, buyPrice, buyTriggerPrice]);

  if (!layout || bars.length === 0) {
    return <p className="text-sm text-ink-muted dark:text-ink-dark-muted text-center py-8">No candle data</p>;
  }

  const { yMin, yMax, plotH, bodyW, y, xCenter } = layout;
  const plotBottom = PAD.top + plotH;
  const plotRight = W - PAD.right;

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const hovered = hoverIdx != null ? bars[hoverIdx] : null;

  return (
    <div className="w-full">
      <div className="relative rounded-lg border border-border dark:border-border-dark bg-surface-muted/50 dark:bg-surface-dark-muted/30 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Pattern candlestick chart"
        >
          {/* Grid */}
          {yTicks.map((p, i) => {
            const yy = y(p);
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={yy}
                  x2={plotRight}
                  y2={yy}
                  stroke="currentColor"
                  className="text-border dark:text-border-dark"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 6}
                  y={yy + 4}
                  textAnchor="end"
                  className="fill-ink-muted dark:fill-ink-dark-muted text-[10px] font-mono"
                >
                  {fmtNumber(p, { max: 0 })}
                </text>
              </g>
            );
          })}

          {/* Buy trigger & buy price */}
          <ReferenceLine y={y(buyTriggerPrice)} label="Trigger" color="#f59e0b" x1={PAD.left} x2={plotRight} />
          <ReferenceLine y={y(buyPrice)} label="Buy" color="#059669" x1={PAD.left} x2={plotRight} />

          {/* Candles */}
          {bars.map((bar, i) => {
            const { candle, role } = bar;
            const cx = xCenter(i);
            const isUp = candle.close >= candle.open;
            const color = isUp ? '#059669' : '#dc2626';
            const yHigh = y(candle.high);
            const yLow = y(candle.low);
            const yOpen = y(candle.open);
            const yClose = y(candle.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyH = Math.max(Math.abs(yClose - yOpen), 2);
            const highlight = role !== 'context';

            return (
              <g
                key={`${candle.date}-${i}`}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className="cursor-default"
              >
                {highlight && (
                  <rect
                    x={cx - bodyW / 2 - 4}
                    y={Math.min(yHigh, bodyTop) - 4}
                    width={bodyW + 8}
                    height={Math.max(yLow - Math.min(yHigh, bodyTop), bodyH) + 8}
                    rx={4}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    opacity={0.7}
                  />
                )}
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1.5} />
                <rect
                  x={cx - bodyW / 2}
                  y={bodyTop}
                  width={bodyW}
                  height={bodyH}
                  fill={isUp ? color : color}
                  stroke={color}
                  strokeWidth={1}
                  rx={1}
                />
                <text
                  x={cx}
                  y={plotBottom + 16}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${highlight ? 'fill-accent' : 'fill-ink-muted dark:fill-ink-dark-muted'}`}
                >
                  {bar.label}
                </text>
                <text
                  x={cx}
                  y={plotBottom + 28}
                  textAnchor="middle"
                  className="fill-ink-muted dark:fill-ink-dark-muted text-[9px] font-mono"
                >
                  {candle.date.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div className="absolute top-2 left-2 right-2 sm:left-auto sm:right-2 sm:max-w-xs card px-3 py-2 text-xs shadow-md pointer-events-none">
            <p className="font-semibold text-ink-primary dark:text-ink-dark-primary">
              {hovered.label} · {hovered.candle.date}
            </p>
            <p className="font-mono tabular-nums text-ink-secondary dark:text-ink-dark-secondary mt-1">
              O {fmtNumber(hovered.candle.open)} · H {fmtNumber(hovered.candle.high)} · L{' '}
              {fmtNumber(hovered.candle.low)} · C {fmtNumber(hovered.candle.close)}
            </p>
            <p className="text-ink-muted dark:text-ink-dark-muted mt-0.5">
              Vol {hovered.candle.volume.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-ink-muted dark:text-ink-dark-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-600" /> Up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-600" /> Down
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-amber-500" /> Buy trigger
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-emerald-600" /> Buy price
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-4 border border-dashed border-accent rounded" /> Pattern bars
        </span>
      </div>
    </div>
  );
}

function ReferenceLine({
  y,
  label,
  color,
  x1,
  x2,
}: {
  y: number;
  label: string;
  color: string;
  x1: number;
  x2: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={1} strokeDasharray="6 4" opacity={0.85} />
      <text x={x2 - 4} y={y - 4} textAnchor="end" fill={color} className="text-[9px] font-semibold">
        {label}
      </text>
    </g>
  );
}
