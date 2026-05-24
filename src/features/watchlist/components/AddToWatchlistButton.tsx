import { useEffect, useRef, useState } from 'react';
import { normalizeNseSymbol } from '../../../lib/nseSymbol';
import { useWatchlists } from '../WatchlistProvider';
import { findListsContaining } from '../watchlistStore';

interface AddToWatchlistButtonProps {
  symbol: string;
  shortName?: string;
  thesis?: {
    entryBuyPrice?: number | null;
    patternDate?: string | null;
    note?: string;
  };
  size?: 'sm' | 'md';
}

export function AddToWatchlistButton({
  symbol,
  shortName,
  thesis,
  size = 'sm',
}: AddToWatchlistButtonProps) {
  const { lists, addSymbol, removeSymbol } = useWatchlists();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const norm = normalizeNseSymbol(symbol);
  const containing = findListsContaining(norm, lists);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const btnClass =
    size === 'sm'
      ? 'px-2.5 py-1.5 text-xs font-semibold rounded-lg'
      : 'px-3 py-2 text-sm font-semibold rounded-lg';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${btnClass} border transition-colors ${
          containing.length
            ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            : 'border-border dark:border-border-dark bg-surface-muted dark:bg-surface-dark-muted text-ink-secondary dark:text-ink-dark-secondary hover:bg-border/30'
        }`}
      >
        {containing.length ? '★ Watchlist' : '+ Watchlist'}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-lg py-1">
          {lists.map((list) => {
            const inList = list.items.some((i) => i.symbol === norm);
            return (
              <button
                key={list.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted dark:hover:bg-surface-dark-muted flex items-center justify-between gap-2"
                onClick={() => {
                  if (inList) {
                    removeSymbol(norm, list.id);
                  } else {
                    addSymbol(norm, list.id, {
                      shortName,
                      thesis: {
                        note: thesis?.note ?? '',
                        entryBuyPrice: thesis?.entryBuyPrice ?? null,
                        patternDate: thesis?.patternDate ?? null,
                        targetPrice: null,
                        stopPrice: null,
                      },
                    });
                  }
                }}
              >
                <span className="truncate">{list.name}</span>
                <span className="text-xs text-ink-muted">{inList ? '✓' : '+'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
