import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Watchlist, WatchlistAlerts, WatchlistThesis } from '../../types/watchlist';
import {
  addToWatchlist,
  createWatchlist,
  deleteWatchlist,
  loadWatchlistsFromCloud,
  removeFromWatchlist,
  renameWatchlist,
  saveWatchlists,
  saveWatchlistsToCloud,
  updateWatchlistItem,
} from './watchlistStore';
import { useAuth } from '../../auth/AuthContext';

interface WatchlistContextValue {
  lists: Watchlist[];
  active: Watchlist | null;
  activeId: string;
  cloudLoading: boolean;
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
  const { user } = useAuth();
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [cloudLoading, setCloudLoading] = useState(false);
  // cloudReady guards the save-to-cloud effect from firing before the initial load
  const cloudReady = useRef(false);

  // Load from cloud whenever the user changes
  useEffect(() => {
    cloudReady.current = false;
    if (!user) {
      setLists([]);
      setActiveId('');
      return;
    }
    setCloudLoading(true);
    loadWatchlistsFromCloud(user.id).then((loaded) => {
      setLists(loaded);
      setActiveId((prev) => (loaded.some((l) => l.id === prev) ? prev : (loaded[0]?.id ?? '')));
      cloudReady.current = true;
      setCloudLoading(false);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to cloud whenever lists change (after initial cloud load)
  useEffect(() => {
    if (!user?.id || !cloudReady.current) return;
    saveWatchlistsToCloud(user.id, lists);
  }, [lists, user?.id]);

  useEffect(() => {
    if (!lists.some((l) => l.id === activeId) && lists[0]) {
      setActiveId(lists[0].id);
    }
  }, [lists, activeId]);

  const active = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  const refresh = useCallback(() => {
    if (!user?.id) return;
    loadWatchlistsFromCloud(user.id).then(setLists);
  }, [user?.id]);

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
      cloudLoading,
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
      cloudLoading,
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
