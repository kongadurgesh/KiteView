import { Candle } from '../types';

interface CandleDetailsProps {
  candle: Candle;
  label: string;
  labelColor: string;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(v: number): string {
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  return v.toLocaleString('en-IN');
}

export function CandleDetails({ candle, label, labelColor }: CandleDetailsProps) {
  const isGreen = candle.close > candle.open;

  const rows: { key: string; value: string; highlight?: string }[] = [
    { key: 'Open', value: formatNum(candle.open) },
    { key: 'High', value: formatNum(candle.high) },
    { key: 'Low', value: formatNum(candle.low) },
    { key: 'Close', value: formatNum(candle.close), highlight: isGreen ? 'text-green-600' : 'text-red-600' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-bold uppercase px-2 py-1 rounded whitespace-nowrap ${labelColor}`}>
          {label}
        </span>
        <span className="text-sm text-gray-500 font-medium ml-auto">{candle.date}</span>
      </div>
      <div className="space-y-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.key} className="flex justify-between gap-2">
            <span className="text-gray-500 shrink-0">{r.key}</span>
            <span className={`font-mono font-medium text-right ${r.highlight ?? ''}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between gap-2 text-sm">
        <span className="text-gray-500 shrink-0">Volume</span>
        <span className="font-mono font-medium text-right">{formatVolume(candle.volume)}</span>
      </div>
    </div>
  );
}
