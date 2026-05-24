import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Watchlist, WatchlistAlerts, WatchlistThesis } from '../../types/watchlist';
import {
  addToWatchlist,
  createWatchlist,
  deleteWatchlist,
  loadWatchlists,
  removeFromWatchlist,
  renameWatchlist,
  saveWatchlists,
  updateWatchlistItem,
} from './watchlistStore';

interface WatchlistContextValue {
  lists: Watchlist[];
  active: Watchlist | null;
  activeId: string;
  setActiveId: (id: string) => void;
  refresh: () => void;
  addList: (name: string) => void;
  removeList: (id: string) => void;
  renameList: (id: string, name: string) => void;
  addSymbol: (
    symbol: string,
    listId?: string,
    opts?: { shortName?: string; thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> },
  ) => void;
  removeSymbol: (symbol: string, listId?: string) => void;
  patchItem: (
    symbol: string,
    patch: { thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> },
    listId?: string,
  ) => void;
  replaceAll: (next: Watchlist[]) => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<Watchlist[]>(() => loadWatchlists());
  const [activeId, setActiveId] = useState<string>(() => loadWatchlists()[0]?.id ?? '');

  useEffect(() => {
    if (!lists.some((l) => l.id === activeId) && lists[0]) {
      setActiveId(lists[0].id);
    }
  }, [lists, activeId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kiteview-watchlists-v1') setLists(loadWatchlists());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const active = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  const refresh = useCallback(() => setLists(loadWatchlists()), []);

  const addList = useCallback((name: string) => {
    setLists((prev) => {
      const next = createWatchlist(name, prev);
      setActiveId(next[next.length - 1].id);
      return next;
    });
  }, []);

  const removeList = useCallback((id: string) => {
    setLists((prev) => deleteWatchlist(id, prev));
  }, []);

  const renameList = useCallback((id: string, name: string) => {
    setLists((prev) => renameWatchlist(id, name, prev));
  }, []);

  const addSymbol = useCallback(
    (
      symbol: string,
      listId?: string,
      opts?: { shortName?: string; thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> },
    ) => {
      setLists((prev) => addToWatchlist(listId ?? activeId, symbol, prev, opts));
    },
    [activeId],
  );

  const removeSymbol = useCallback(
    (symbol: string, listId?: string) => {
      setLists((prev) => {
        const target = listId ?? activeId ?? prev[0]?.id;
        if (!target) return prev;
        return removeFromWatchlist(target, symbol, prev);
      });
    },
    [activeId],
  );

  const patchItem = useCallback(
    (
      symbol: string,
      patch: { thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> },
      listId?: string,
    ) => {
      setLists((prev) => updateWatchlistItem(listId ?? activeId, symbol, prev, patch));
    },
    [activeId],
  );

  const replaceAll = useCallback((next: Watchlist[]) => {
    saveWatchlists(next);
    setLists(next);
  }, []);

  const value = useMemo(
    () => ({
      lists,
      active,
      activeId,
      setActiveId,
      refresh,
      addList,
      removeList,
      renameList,
      addSymbol,
      removeSymbol,
      patchItem,
      replaceAll,
    }),
    [
      lists,
      active,
      activeId,
      refresh,
      addList,
      removeList,
      renameList,
      addSymbol,
      removeSymbol,
      patchItem,
      replaceAll,
    ],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlists(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlists must be used within WatchlistProvider');
  return ctx;
}
