import { useEffect, useRef, useState } from 'react';
import { TICKER_INDICES } from '../../data/indicesCatalog';
import { fmtQuotePct } from '../../lib/format';
import {
  fetchIndexQuotes,
  formatIndexChange,
  formatIndexPrice,
  INDEX_QUOTE_REFRESH_MS,
  type IndexQuote,
} from '../../services/indexQuotes';

interface MarketTickerProps {
  sidebarExpanded?: boolean;
}

function TickerItem({ q }: { q: IndexQuote }) {
  const isUp = (q.change ?? 0) >= 0;
  const hasData = q.price != null;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap shrink-0 px-3 sm:px-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{q.instrument.label}</span>
      <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
        {hasData ? formatIndexPrice(q) : '—'}
      </span>
      {hasData && (
        <span
          className={`text-xs font-mono font-medium ${
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatIndexChange(q)} ({fmtQuotePct(q.changePct)})
        </span>
      )}
    </div>
  );
}

function TickerTrack({ quotes, ariaHidden }: { quotes: IndexQuote[]; ariaHidden?: boolean }) {
  return (
    <div
      className="flex items-center shrink-0"
      aria-hidden={ariaHidden}
    >
      {quotes.map((q) => (
        <TickerItem key={`${ariaHidden ? 'dup-' : ''}${q.instrument.id}`} q={q} />
      ))}
    </div>
  );
}

export function MarketTicker({ sidebarExpanded }: MarketTickerProps) {
  const sidebarOffset = sidebarExpanded ? '8.5rem' : '0px';
  const [quotes, setQuotes] = useState<IndexQuote[]>(() =>
    TICKER_INDICES.map((instrument) => ({
      instrument,
      price: null,
      change: null,
      changePct: null,
    })),
  );
  const [marquee, setMarquee] = useState(false);
  const [marqueeAllowed, setMarqueeAllowed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delay = setTimeout(() => setMarqueeAllowed(true), 1000);
    return () => clearTimeout(delay);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await fetchIndexQuotes(TICKER_INDICES);
      if (!cancelled) setQuotes(results);
    }

    void load();
    const interval = setInterval(load, INDEX_QUOTE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const check = () => {
      setMarquee(marqueeAllowed && track.scrollWidth > container.clientWidth + 2);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    ro.observe(track);
    return () => ro.disconnect();
  }, [quotes, marqueeAllowed]);

  const barClass =
    'h-10 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 shrink-0 overflow-hidden px-4 sm:px-6 lg:pl-[calc(1.5rem+var(--sidebar-offset))] lg:pr-6 lg:transition-[padding-left] lg:duration-200';

  const barStyle = { ['--sidebar-offset' as string]: sidebarOffset };

  return (
    <div className={barClass} style={barStyle}>
      <div ref={containerRef} className="h-full w-full overflow-hidden flex items-center">
        <div
          ref={trackRef}
          className={`flex items-center h-full ${marquee ? 'ticker-marquee-track' : ''}`}
        >
          <TickerTrack quotes={quotes} />
          {marquee && <TickerTrack quotes={quotes} ariaHidden />}
        </div>
      </div>
    </div>
  );
}
