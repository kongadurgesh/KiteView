import { useState } from 'react';
import { PatternMatch } from '../../types';
import type { PatternChartBar } from './patternChartCandles';
import { PatternCandleChart } from './components/PatternCandleChart';
import type { StockStats } from '../../types/stockStats';
import type { QuoteSnapshot } from './quoteSnapshot';
import { fmtMarketCapCr, fmtNumber, fmtPct, fmtRatio, fmtMarketCap } from '../../lib/format';
import { capCategoryBadgeClass, getCapCategory } from '../../lib/marketCap';
import { QuantityTable } from './QuantityTable';

interface ResultCardProps {
  match: PatternMatch;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  allTimeHigh: number;
  marketCapCr: number;
  sector: string;
  industry: string;
  quoteSnapshot: QuoteSnapshot | null;
  stockStats: StockStats | null;
  patternChartBars: PatternChartBar[];
}

const fmt = fmtNumber;

function fmtVol(v: number | null): string {
  if (v == null || v <= 0) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function ResultCard({
  match,
  currentPrice,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  allTimeHigh,
  marketCapCr,
  sector,
  industry,
  quoteSnapshot,
  stockStats,
  patternChartBars,
}: ResultCardProps) {
  const priceDiff = currentPrice - match.buyPrice;
  const priceDiffPct = ((priceDiff / match.buyPrice) * 100).toFixed(2);
  const isAbove = priceDiff >= 0;
  const signal = currentPrice > match.buyPrice ? 'WAIT' : 'BUY';
  const capCategory = capCategoryBadgeClass(getCapCategory(marketCapCr));
  const [slPct, setSlPct] = useState(10);
  const stopLossPrice = parseFloat((match.buyPrice * (1 - slPct / 100)).toFixed(2));

  const ch = quoteSnapshot?.change;
  const chPct = quoteSnapshot?.changePercent;
  const dayPnlColor =
    ch != null && ch >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  const hasQuote =
    quoteSnapshot &&
    [
      quoteSnapshot.change,
      quoteSnapshot.changePercent,
      quoteSnapshot.previousClose,
      quoteSnapshot.dayHigh,
      quoteSnapshot.dayLow,
      quoteSnapshot.volume,
    ].some((v) => v != null);

  return (
    <div className="w-full space-y-4 mt-2">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <p className="label-caps">Pattern & signal</p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Indicator label="Pattern">
              <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-accent-muted dark:bg-accent-dark-muted text-accent dark:text-accent">
                {match.patternName}
              </span>
            </Indicator>
            {marketCapCr > 0 && (
              <Indicator label="Market Cap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${capCategory.color}`}>
                  {capCategory.label} &middot; {fmtMarketCapCr(marketCapCr)}
                </span>
              </Indicator>
            )}
            <Indicator label="Signal">
              <span
                className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${
                  signal === 'BUY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
                }`}
              >
                {signal}
              </span>
            </Indicator>
            <Indicator label="Pattern Date">
              <span className="text-xs font-medium text-ink-secondary dark:text-ink-dark-secondary bg-surface-muted dark:bg-surface-dark-muted px-2.5 py-1 rounded-full border border-border dark:border-border-dark">
                {match.candle3.date}
              </span>
            </Indicator>
            {(sector || industry) && (
              <Indicator label="Sector">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-muted dark:bg-surface-dark-muted text-ink-secondary dark:text-ink-dark-secondary border border-border dark:border-border-dark">
                  {[industry, sector].filter(Boolean).join(' · ')}
                </span>
              </Indicator>
            )}
          </div>
        </div>
      </div>

      {hasQuote && quoteSnapshot && (
        <div className="card p-5">
          <p className="label-caps mb-3">Session</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat label="Day chg" value={ch != null ? `${ch >= 0 ? '+' : ''}${fmt(ch)}` : '—'} valueClass={ch != null ? dayPnlColor : undefined} />
            <MiniStat label="Day chg %" value={chPct != null ? fmtPct(chPct) : '—'} valueClass={chPct != null ? dayPnlColor : undefined} />
            <MiniStat label="Prev close" value={quoteSnapshot.previousClose != null ? fmt(quoteSnapshot.previousClose) : '—'} />
            <MiniStat label="Day high" value={quoteSnapshot.dayHigh != null ? fmt(quoteSnapshot.dayHigh) : '—'} />
            <MiniStat label="Day low" value={quoteSnapshot.dayLow != null ? fmt(quoteSnapshot.dayLow) : '—'} />
            <MiniStat label="Volume" value={fmtVol(quoteSnapshot.volume)} />
          </div>
        </div>
      )}

      {stockStats && (
        <div className="card p-5">
          <p className="label-caps mb-3">Key stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat label="P/E" value={fmtRatio(stockStats.pe)} />
            <MiniStat label="Fwd P/E" value={fmtRatio(stockStats.forwardPE)} />
            <MiniStat label="P/B" value={fmtRatio(stockStats.pb)} />
            <MiniStat label="Beta" value={fmtRatio(stockStats.beta)} />
            <MiniStat label="52W chg" value={fmtPct(stockStats.fiftyTwoWeekChange)} />
            <MiniStat label="Mkt cap" value={fmtMarketCap(stockStats.marketCap)} />
          </div>
        </div>
      )}

      <div className="card p-5">
        <p className="label-caps mb-1">Pattern chart</p>
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted mb-4">
          Base, pattern, and breakout bars (with context). Hover a candle for OHLC. Dashed lines = buy trigger and buy price.
        </p>
        <PatternCandleChart
          bars={patternChartBars}
          buyPrice={match.buyPrice}
          buyTriggerPrice={match.buyTriggerPrice}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PriceCard
          label="Buy Trigger Price"
          value={fmt(match.buyTriggerPrice)}
          sub={`0.985 × ${fmt(match.candle3.close)}`}
          accent="amber"
        />
        <PriceCard
          label="Buy Price"
          value={fmt(match.buyPrice)}
          sub={`0.98 × ${fmt(match.candle3.close)}`}
          accent="green"
        />
        <div className="card-muted p-5 text-center border-emerald-200/80 dark:border-emerald-900/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-2">Current price</p>
          <p className="text-3xl font-bold text-ink-primary dark:text-ink-dark-primary font-mono tabular-nums">{fmt(currentPrice)}</p>
          <p className={`text-sm font-semibold mt-2 ${isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isAbove ? '+' : ''}
            {priceDiffPct}%
            <span className="font-normal text-ink-muted dark:text-ink-dark-muted text-xs ml-1">from buy price</span>
          </p>
        </div>
      </div>

      <div className="card border-red-200/80 dark:border-red-900/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Stop loss %</p>
          <select
            value={slPct}
            onChange={(e) => setSlPct(Number(e.target.value))}
            className="rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark-muted px-3 py-1.5 text-sm font-medium text-ink-primary dark:text-ink-dark-primary focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </select>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Stop loss price</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">{fmt(stopLossPrice)}</p>
          <p className="text-xs text-red-600/90 dark:text-red-400/90 mt-0.5">
            {(1 - slPct / 100).toFixed(3)} × {fmt(match.buyPrice)} (buy price)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatChip
          label="52W High"
          value={fmt(fiftyTwoWeekHigh)}
          note={
            currentPrice > 0 && fiftyTwoWeekHigh > 0
              ? `${((1 - currentPrice / fiftyTwoWeekHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
        <StatChip
          label="52W Low"
          value={fmt(fiftyTwoWeekLow)}
          note={
            currentPrice > 0 && fiftyTwoWeekLow > 0
              ? `${(((currentPrice / fiftyTwoWeekLow) - 1) * 100).toFixed(1)}% above`
              : undefined
          }
        />
        <StatChip
          label="All-time high"
          value={fmt(allTimeHigh)}
          note={
            currentPrice > 0 && allTimeHigh > 0
              ? `${((1 - currentPrice / allTimeHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
      </div>

      <div className="card p-6">
        <QuantityTable buyPrice={match.buyPrice} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="card-muted px-3 py-2.5 rounded-lg text-center sm:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">{label}</p>
      <p className={`text-sm font-mono font-semibold tabular-nums mt-0.5 text-ink-primary dark:text-ink-dark-primary ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}

function PriceCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'amber' | 'green' }) {
  const colors =
    accent === 'amber'
      ? 'border-amber-200/80 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
      : 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-300';
  const subColor =
    accent === 'amber' ? 'text-amber-700/90 dark:text-amber-400/90' : 'text-emerald-700/90 dark:text-emerald-400/90';

  return (
    <div className={`rounded-xl border p-5 text-center ${colors}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">{label}</p>
      <p className="text-3xl font-bold font-mono tabular-nums">{value}</p>
      <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
    </div>
  );
}

function StatChip({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card-muted px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">{label}</p>
      <p className="text-lg font-bold text-ink-primary dark:text-ink-dark-primary font-mono tabular-nums">{value}</p>
      {note && <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-0.5">{note}</p>}
    </div>
  );
}

function Indicator({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start sm:items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">{label}</span>
      {children}
    </div>
  );
}
