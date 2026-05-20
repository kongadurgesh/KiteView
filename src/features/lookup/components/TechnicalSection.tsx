import type { TechnicalSummary } from '../technicalUtils';
import { PriceChart1Y } from './PriceChart1Y';

interface Props {
  technical: TechnicalSummary;
  priceSeries: { date: string; close: number }[];
}

export function TechnicalSection({ technical, priceSeries }: Props) {
  return (
    <div className="card p-5 space-y-4">
      <p className="label-caps">Technicals</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Stat label="Trend" value={technical.trendLabel} />
        <Stat
          label="vs 52W high"
          value={technical.pctFrom52WeekHigh != null ? `${technical.pctFrom52WeekHigh.toFixed(1)}%` : '—'}
        />
        <Stat
          label="vs 52W low"
          value={technical.pctFrom52WeekLow != null ? `+${technical.pctFrom52WeekLow.toFixed(1)}%` : '—'}
        />
        <Stat
          label="Range position"
          value={technical.rangePositionPct != null ? `${technical.rangePositionPct.toFixed(0)}%` : '—'}
        />
        <Stat label="50-day SMA" value={technical.sma50 != null ? technical.sma50.toFixed(2) : '—'} />
        <Stat
          label="Above SMA50"
          value={technical.aboveSma50 == null ? '—' : technical.aboveSma50 ? 'Yes' : 'No'}
        />
        <Stat label="RSI (14)" value={technical.rsi14 != null ? technical.rsi14.toFixed(1) : '—'} />
      </div>
      <div>
        <p className="text-xs font-medium text-ink-muted dark:text-ink-dark-muted mb-2">1-year price</p>
        <PriceChart1Y data={priceSeries} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-muted px-3 py-2 rounded-lg">
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="text-sm font-semibold font-mono mt-0.5">{value}</p>
    </div>
  );
}
