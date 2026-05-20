import type { StockStats } from '../../../types/stockStats';
import type { QuoteSnapshot } from '../quoteSnapshot';
import { fmtMarketCap, fmtMarketCapCr, fmtNumber, fmtPct, fmtRatio, fmtVolume } from '../../../lib/format';
import { capCategoryBadgeClass, getCapCategory } from '../../../lib/marketCap';

interface Props {
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  allTimeHigh: number;
  marketCapCr: number;
  sector: string;
  industry: string;
  quoteSnapshot: QuoteSnapshot | null;
  stockStats: StockStats | null;
}

export function StockOverviewSection({
  currentPrice,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  allTimeHigh,
  marketCapCr,
  sector,
  industry,
  quoteSnapshot,
  stockStats,
}: Props) {
  const cap = capCategoryBadgeClass(getCapCategory(marketCapCr));
  const ch = quoteSnapshot?.change;
  const chPct = quoteSnapshot?.changePercent;
  const dayColor =
    ch != null && ch >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  const hasQuote =
    quoteSnapshot &&
    [quoteSnapshot.change, quoteSnapshot.changePercent, quoteSnapshot.previousClose, quoteSnapshot.dayHigh, quoteSnapshot.dayLow, quoteSnapshot.volume].some(
      (v) => v != null,
    );

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="label-caps">Overview</p>
        {marketCapCr > 0 && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cap.color}`}>
            {cap.label} · {fmtMarketCapCr(marketCapCr)}
          </span>
        )}
        {(sector || industry) && (
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
            {[industry, sector].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {hasQuote && quoteSnapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="Day chg" value={ch != null ? `${ch >= 0 ? '+' : ''}${fmtNumber(ch)}` : '—'} valueClass={ch != null ? dayColor : undefined} />
          <MiniStat label="Day chg %" value={chPct != null ? fmtPct(chPct) : '—'} valueClass={chPct != null ? dayColor : undefined} />
          <MiniStat label="Prev close" value={quoteSnapshot.previousClose != null ? fmtNumber(quoteSnapshot.previousClose) : '—'} />
          <MiniStat label="Day high" value={quoteSnapshot.dayHigh != null ? fmtNumber(quoteSnapshot.dayHigh) : '—'} />
          <MiniStat label="Day low" value={quoteSnapshot.dayLow != null ? fmtNumber(quoteSnapshot.dayLow) : '—'} />
          <MiniStat label="Volume" value={fmtVolume(quoteSnapshot.volume)} />
        </div>
      )}

      {stockStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="P/E" value={fmtRatio(stockStats.pe)} />
          <MiniStat label="Fwd P/E" value={fmtRatio(stockStats.forwardPE)} />
          <MiniStat label="P/B" value={fmtRatio(stockStats.pb)} />
          <MiniStat label="Beta" value={fmtRatio(stockStats.beta)} />
          <MiniStat label="52W chg" value={fmtPct(stockStats.fiftyTwoWeekChange)} />
          <MiniStat label="Mkt cap" value={fmtMarketCap(stockStats.marketCap)} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MiniStat
          label="52W high"
          value={fmtNumber(fiftyTwoWeekHigh)}
          note={
            currentPrice > 0 && fiftyTwoWeekHigh > 0
              ? `${((1 - currentPrice / fiftyTwoWeekHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
        <MiniStat
          label="52W low"
          value={fmtNumber(fiftyTwoWeekLow)}
          note={
            currentPrice > 0 && fiftyTwoWeekLow > 0
              ? `${(((currentPrice / fiftyTwoWeekLow) - 1) * 100).toFixed(1)}% above`
              : undefined
          }
        />
        <MiniStat
          label="All-time high"
          value={fmtNumber(allTimeHigh)}
          note={
            currentPrice > 0 && allTimeHigh > 0
              ? `${((1 - currentPrice / allTimeHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass, note }: { label: string; value: string; valueClass?: string; note?: string }) {
  return (
    <div className="card-muted px-3 py-2.5 rounded-lg">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">{label}</p>
      <p className={`text-sm font-mono font-semibold tabular-nums mt-0.5 ${valueClass ?? 'text-ink-primary dark:text-ink-dark-primary'}`}>{value}</p>
      {note && <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-0.5">{note}</p>}
    </div>
  );
}
