import { useState } from 'react';
import { PatternMatch } from '../../../types';
import type { PatternChartBar } from '../patternChartCandles';
import { PatternCandleChart } from './PatternCandleChart';
import { PAGE_COPY } from '../../../content/pageCopy';
import { fmtNumber } from '../../../lib/format';
import { getTradeSignal } from '../../../lib/tradeSignal';
import { QuantityTable } from '../QuantityTable';

interface Props {
  match: PatternMatch;
  currentPrice: number;
  patternChartBars: PatternChartBar[];
}

export function BullishPatternSection({ match, currentPrice, patternChartBars }: Props) {
  const priceDiff = currentPrice - match.buyPrice;
  const priceDiffPct = ((priceDiff / match.buyPrice) * 100).toFixed(2);
  const isAbove = priceDiff >= 0;
  const signal = getTradeSignal(currentPrice, match.buyPrice);
  const [slPct, setSlPct] = useState(10);
  const stopLossPrice = parseFloat((match.buyPrice * (1 - slPct / 100)).toFixed(2));

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="label-caps mb-3">Breakout</p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge label="Signal" highlight={signal === 'BUY'}>
            {signal}
          </Badge>
          <Badge label="Pattern date">{match.candle3.date}</Badge>
        </div>
      </div>

      <div className="card p-5">
        <p className="label-caps mb-1">Pattern chart</p>
        <p className="section-desc mb-4">{PAGE_COPY.analysis.patternChartNote}</p>
        <PatternCandleChart
          bars={patternChartBars}
          buyPrice={match.buyPrice}
          buyTriggerPrice={match.buyTriggerPrice}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <PriceCard
          label="Buy trigger"
          value={fmtNumber(match.buyTriggerPrice)}
          sub={`0.985 × ${fmtNumber(match.candle3.close)}`}
          accent="amber"
        />
        <PriceCard
          label="Buy price"
          value={fmtNumber(match.buyPrice)}
          sub={`0.98 × ${fmtNumber(match.candle3.close)}`}
          accent="green"
        />
        <div className="card-muted p-4 text-center border-emerald-200/80 dark:border-emerald-900/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">Current price</p>
          <p className="text-2xl font-bold font-mono tabular-nums">{fmtNumber(currentPrice)}</p>
          <p className={`text-sm font-semibold mt-1 ${isAbove ? 'text-emerald-600' : 'text-red-600'}`}>
            {isAbove ? '+' : ''}
            {priceDiffPct}% from buy
          </p>
        </div>
      </div>

      <div className="card border-red-200/80 dark:border-red-900/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase text-ink-muted">Stop loss %</p>
          <select
            value={slPct}
            onChange={(e) => setSlPct(Number(e.target.value))}
            className="rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-muted text-ink-primary dark:text-ink-dark-primary px-3 py-1.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent dark:[color-scheme:dark]"
          >
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </select>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-red-600 mb-1">Stop loss price</p>
          <p className="text-xl font-bold text-red-600 font-mono">{fmtNumber(stopLossPrice)}</p>
        </div>
      </div>

      <div className="card p-5">
        <QuantityTable buyPrice={match.buyPrice} />
      </div>
    </div>
  );
}

function Badge({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase text-ink-muted">{label}</span>
      <span
        className={`text-xs font-semibold uppercase px-2.5 py-1 rounded-full ${
          highlight
            ? 'bg-emerald-600 text-white'
            : 'bg-surface-muted dark:bg-surface-dark-muted text-ink-secondary border border-border dark:border-border-dark'
        }`}
      >
        {children}
      </span>
    </div>
  );
}

function PriceCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'amber' | 'green';
}) {
  const colors =
    accent === 'amber'
      ? 'border-amber-200/80 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
      : 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/25';
  return (
    <div className={`rounded-xl border p-4 text-center ${colors}`}>
      <p className="text-xs font-semibold uppercase opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
      <p className="text-xs mt-1 opacity-80">{sub}</p>
    </div>
  );
}
