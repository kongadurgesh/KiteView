import { normalizeNseSymbol } from '../../lib/nseSymbol';
import type { Watchlist, WatchlistAlerts, WatchlistItem, WatchlistThesis } from '../../types/watchlist';
import { DEFAULT_ALERTS, EMPTY_THESIS } from '../../types/watchlist';
import { supabase } from '../../auth/supabase';

const STORAGE_KEY = 'kiteview-watchlists-v1';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultWatchlist(): Watchlist {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: 'My Watchlist',
    createdAt: now,
    items: [],
  };
}

export async function loadWatchlistsFromCloud(userId: string): Promise<Watchlist[]> {
  const { data, error } = await supabase
    .from('watchlists')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return [defaultWatchlist()];
  const parsed = data.data as Watchlist[];
  if (!Array.isArray(parsed) || parsed.length === 0) return [defaultWatchlist()];
  return parsed;
}

export async function saveWatchlistsToCloud(userId: string, lists: Watchlist[]): Promise<void> {
  await supabase.from('watchlists').upsert(
    { user_id: userId, data: lists, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

export function loadWatchlists(): Watchlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [defaultWatchlist()];
    const parsed = JSON.parse(raw) as Watchlist[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [defaultWatchlist()];
    return parsed;
  } catch {
    return [defaultWatchlist()];
  }
}

export function saveWatchlists(lists: Watchlist[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function createWatchlist(name: string, lists: Watchlist[]): Watchlist[] {
  const list: Watchlist = {
    id: newId(),
    name: name.trim() || 'Watchlist',
    createdAt: new Date().toISOString(),
    items: [],
  };
  const next = [...lists, list];
  saveWatchlists(next);
  return next;
}

export function deleteWatchlist(id: string, lists: Watchlist[]): Watchlist[] {
  if (lists.length <= 1) return lists;
  const next = lists.filter((l) => l.id !== id);
  saveWatchlists(next);
  return next;
}

export function renameWatchlist(id: string, name: string, lists: Watchlist[]): Watchlist[] {
  const next = lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l));
  saveWatchlists(next);
  return next;
}

export function addToWatchlist(
  listId: string,
  symbol: string,
  lists: Watchlist[],
  opts?: {
    shortName?: string;
    thesis?: Partial<WatchlistThesis>;
    alerts?: Partial<WatchlistAlerts>;
  },
): Watchlist[] {
  const norm = normalizeNseSymbol(symbol);
  const next = lists.map((list) => {
    if (list.id !== listId) return list;
    if (list.items.some((i) => i.symbol === norm)) return list;
    const item: WatchlistItem = {
      symbol: norm,
      shortName: opts?.shortName?.trim() || norm,
      addedAt: new Date().toISOString(),
      thesis: { ...EMPTY_THESIS, ...opts?.thesis },
      alerts: { ...DEFAULT_ALERTS, ...opts?.alerts },
    };
    return { ...list, items: [...list.items, item] };
  });
  saveWatchlists(next);
  return next;
}

export function removeFromWatchlist(listId: string, symbol: string, lists: Watchlist[]): Watchlist[] {
  const norm = normalizeNseSymbol(symbol);
  const next = lists.map((list) =>
    list.id === listId
      ? { ...list, items: list.items.filter((i) => i.symbol !== norm) }
      : list,
  );
  saveWatchlists(next);
  return next;
}

export function updateWatchlistItem(
  listId: string,
  symbol: string,
  lists: Watchlist[],
  patch: { thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> },
): Watchlist[] {
  const norm = normalizeNseSymbol(symbol);
  const next = lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      items: list.items.map((item) =>
        item.symbol === norm
          ? {
              ...item,
              thesis: patch.thesis ? { ...item.thesis, ...patch.thesis } : item.thesis,
              alerts: patch.alerts ? { ...item.alerts, ...patch.alerts } : item.alerts,
            }
          : item,
      ),
    };
  });
  saveWatchlists(next);
  return next;
}

export function isInAnyWatchlist(symbol: string, lists: Watchlist[]): boolean {
  const norm = normalizeNseSymbol(symbol);
  return lists.some((l) => l.items.some((i) => i.symbol === norm));
}

export function findListsContaining(symbol: string, lists: Watchlist[]): Watchlist[] {
  const norm = normalizeNseSymbol(symbol);
  return lists.filter((l) => l.items.some((i) => i.symbol === norm));
}
