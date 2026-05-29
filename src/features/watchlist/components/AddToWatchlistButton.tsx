import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../auth/AuthContext';
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
  variant?: 'default' | 'icon';
}

export function AddToWatchlistButton({
  symbol,
  shortName,
  thesis,
  size = 'sm',
  variant = 'default',
}: AddToWatchlistButtonProps) {
  const { lists, addSymbol, removeSymbol } = useWatchlists();
  const { user, openLoginModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const norm = normalizeNseSymbol(symbol);
  const containing = findListsContaining(norm, lists);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = Math.min(Math.max(220, rect.width), window.innerWidth - 16);
    const left = Math.min(rect.right - menuWidth, Math.max(8, window.innerWidth - menuWidth - 8));
    const top = Math.min(rect.bottom + 6, window.innerHeight - 16);
    setMenuStyle({ position: 'fixed', left, top, width: menuWidth, zIndex: 70 });
  }, [open]);

  const btnClass =
    variant === 'icon'
      ? 'h-7 w-7 text-sm rounded-full inline-flex items-center justify-center'
      : size === 'sm'
        ? 'px-2.5 py-1.5 text-xs font-semibold rounded-lg'
        : 'px-3 py-2 text-sm font-semibold rounded-lg';

  const label = !user
    ? variant === 'icon'
      ? '+'
      : 'Sign in to add'
    : containing.length
      ? variant === 'icon'
        ? '★'
        : '★ Watchlist'
      : variant === 'icon'
        ? '+'
        : '+ Watchlist';

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!user) {
            openLoginModal();
            return;
          }
          setOpen((v) => !v);
        }}
        className={`${btnClass} border transition-colors ${
          containing.length
            ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
            : 'border-border dark:border-border-dark bg-surface-muted dark:bg-surface-dark-muted text-ink-secondary dark:text-ink-dark-secondary hover:bg-border/30'
        }`}
        aria-label={!user ? 'Sign in to add to watchlist' : 'Add to watchlist'}
        title={!user ? 'Sign in to add to watchlist' : containing.length ? 'Edit watchlist membership' : 'Add to watchlist'}
      >
        {label}
      </button>
      {open && createPortal(
        <div ref={menuRef} style={menuStyle} className="rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-lg py-1">
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
        </div>,
        document.body,
      )}
    </div>
  );
}
