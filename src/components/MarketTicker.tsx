import { useEffect, useState } from 'react';

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

interface IndexQuote {
  label: string;
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

const INDICES = [
  { label: 'NIFTY 50', symbol: '^NSEI' },
  { label: 'SENSEX', symbol: '^BSESN' },
  { label: 'BANK NIFTY', symbol: '^NSEBANK' },
  { label: 'NIFTY IT', symbol: '^CNXIT' },
];

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MarketTickerProps {
  sidebarExpanded?: boolean;
}

export function MarketTicker({ sidebarExpanded }: MarketTickerProps) {
  const sidebarOffset = sidebarExpanded ? '8.5rem' : '0px';
  const [quotes, setQuotes] = useState<IndexQuote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuotes() {
      try {
        const symbols = INDICES.map((idx) => idx.symbol).join(',');
        const res = await fetch(`${PROXY_BASE}/api/quote/${encodeURIComponent(symbols)}`);
        if (!res.ok) return;
        const data = await res.json();
        const bySymbol: Record<string, { regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number }> = {};
        for (const q of data?.quoteResponse?.result ?? []) {
          if (q?.symbol) bySymbol[q.symbol] = q;
        }
        const results = INDICES.map((idx) => {
          const q = bySymbol[idx.symbol] ?? {};
          return {
            label: idx.label,
            symbol: idx.symbol,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePct: q.regularMarketChangePercent ?? 0,
          } as IndexQuote;
        });
        if (!cancelled) setQuotes(results);
      } catch {
        // silently fail -- ticker is non-critical
      }
    }

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const barClass =
    'h-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 flex items-center overflow-x-auto shrink-0 px-4 sm:px-6 lg:pl-[calc(1.5rem+var(--sidebar-offset))] lg:pr-6 lg:transition-[padding-left] lg:duration-200';

  const barStyle = { ['--sidebar-offset' as string]: sidebarOffset };

  if (quotes.length === 0) {
    return (
      <div className={barClass} style={barStyle}>
        <div className="flex gap-4 sm:gap-8">
          {INDICES.map((idx) => (
            <span key={idx.symbol} className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{idx.label} --</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={barClass} style={barStyle}>
      <div className="flex gap-4 sm:gap-8">
        {quotes.map((q) => {
          const isUp = q.change >= 0;
          return (
            <div key={q.symbol} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{q.label}</span>
              <span className="text-xs font-mono text-gray-800 dark:text-gray-200">{fmt(q.price)}</span>
              <span className={`text-xs font-mono font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isUp ? '+' : ''}{fmt(q.change)} ({isUp ? '+' : ''}{q.changePct.toFixed(2)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
