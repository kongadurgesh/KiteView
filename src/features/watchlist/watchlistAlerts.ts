import type { WatchlistItem, WatchlistSnapshot } from '../../types/watchlist';

const PREV_KEY = 'kiteview-watchlist-alert-prev';

type PrevMap = Record<string, WatchlistSnapshot>;

function loadPrev(): PrevMap {
  try {
    const raw = sessionStorage.getItem(PREV_KEY);
    return raw ? (JSON.parse(raw) as PrevMap) : {};
  } catch {
    return {};
  }
}

function savePrev(map: PrevMap): void {
  try {
    sessionStorage.setItem(PREV_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

function notify(title: string, body: string, symbol: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: `kiteview-${symbol}` });
  } catch {
    /* ignore */
  }
}

export function evaluateWatchlistAlerts(
  items: WatchlistItem[],
  snapshots: Record<string, WatchlistSnapshot>,
): string[] {
  const prev = loadPrev();
  const fired: string[] = [];
  const next: PrevMap = { ...prev };

  for (const item of items) {
    const snap = snapshots[item.symbol];
    if (!snap) continue;
    next[item.symbol] = snap;
    const old = prev[item.symbol];

    if (item.alerts.buyWindow && snap.signal === 'BUY' && old?.signal !== 'BUY') {
      const msg = `${item.shortName}: BUY window — CMP within 2% of buy price`;
      fired.push(msg);
      notify('KiteView BUY signal', msg, item.symbol);
    }

    if (item.alerts.patternToday && snap.patternToday && !old?.patternToday) {
      const msg = `${item.shortName}: breakout pattern on latest session`;
      fired.push(msg);
      notify('KiteView pattern alert', msg, item.symbol);
    }

    if (
      item.alerts.swotFlip
      && snap.swotStrengths != null
      && snap.swotWeaknesses != null
      && snap.swotStrengths < snap.swotWeaknesses
      && (old == null || old.swotStrengths == null || old.swotStrengths >= (old.swotWeaknesses ?? 0))
    ) {
      const msg = `${item.shortName}: SWOT flipped — strengths below weaknesses`;
      fired.push(msg);
      notify('KiteView SWOT alert', msg, item.symbol);
    }
  }

  savePrev(next);
  return fired;
}
