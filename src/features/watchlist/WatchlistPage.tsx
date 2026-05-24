import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { Alert, Button } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import { fmtDistPct, fmtNumber, fmtQuotePct } from '../../lib/format';
import { fetchWatchlistSnapshot } from '../../services/apiBatch';
import type { WatchlistAlerts, WatchlistItem, WatchlistSnapshot, WatchlistThesis } from '../../types/watchlist';
import { useWatchlists } from './WatchlistProvider';
import { evaluateWatchlistAlerts, requestNotificationPermission } from './watchlistAlerts';

function SignalBadge({ signal }: { signal: 'BUY' | 'WAIT' }) {
  const isBuy = signal === 'BUY';
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
        isBuy
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400'
      }`}
    >
      {signal}
    </span>
  );
}

function ThesisPanel({
  item,
  onPatch,
}: {
  item: WatchlistItem;
  onPatch: (patch: { thesis?: Partial<WatchlistThesis>; alerts?: Partial<WatchlistAlerts> }) => void;
}) {
  const [note, setNote] = useState(item.thesis.note);
  const [targetPrice, setTargetPrice] = useState(item.thesis.targetPrice?.toString() ?? '');
  const [stopPrice, setStopPrice] = useState(item.thesis.stopPrice?.toString() ?? '');
  const [entryBuyPrice, setEntryBuyPrice] = useState(item.thesis.entryBuyPrice?.toString() ?? '');
  const [patternDate, setPatternDate] = useState(item.thesis.patternDate ?? '');

  useEffect(() => {
    setNote(item.thesis.note);
    setTargetPrice(item.thesis.targetPrice?.toString() ?? '');
    setStopPrice(item.thesis.stopPrice?.toString() ?? '');
    setEntryBuyPrice(item.thesis.entryBuyPrice?.toString() ?? '');
    setPatternDate(item.thesis.patternDate ?? '');
  }, [item]);

  const saveThesis = () => {
    onPatch({
      thesis: {
        note,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopPrice: stopPrice ? parseFloat(stopPrice) : null,
        entryBuyPrice: entryBuyPrice ? parseFloat(entryBuyPrice) : null,
        patternDate: patternDate || null,
      },
    });
  };

  return (
    <div className="px-3 pb-4 pt-2 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Thesis note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveThesis}
            rows={3}
            className="input-field mt-1 w-full text-sm"
            placeholder="Why are you watching this name?"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Target price</span>
          <input
            type="number"
            step="any"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            onBlur={saveThesis}
            className="input-field mt-1 w-full text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Stop price</span>
          <input
            type="number"
            step="any"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            onBlur={saveThesis}
            className="input-field mt-1 w-full text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Entry buy price</span>
          <input
            type="number"
            step="any"
            value={entryBuyPrice}
            onChange={(e) => setEntryBuyPrice(e.target.value)}
            onBlur={saveThesis}
            className="input-field mt-1 w-full text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink-muted dark:text-ink-dark-muted">Pattern date</span>
          <input
            type="date"
            value={patternDate}
            onChange={(e) => setPatternDate(e.target.value)}
            onBlur={saveThesis}
            className="input-field mt-1 w-full text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {(
          [
            ['buyWindow', 'BUY window'],
            ['swotFlip', 'SWOT flip'],
            ['patternToday', 'Pattern today'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-ink-secondary dark:text-ink-dark-secondary">
            <input
              type="checkbox"
              checked={item.alerts[key]}
              onChange={(e) => onPatch({ alerts: { [key]: e.target.checked } })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function WatchlistPage() {
  const { viewStock } = useAppNavigation();
  const { lists, active, activeId, setActiveId, addList, removeList, renameList, removeSymbol, patchItem } =
    useWatchlists();
  const [snapshots, setSnapshots] = useState<Record<string, WatchlistSnapshot>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alertMessages, setAlertMessages] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  const symbolsKey = active?.items.map((i) => i.symbol).join(',') ?? '';

  const refreshSnapshots = useCallback(async () => {
    const symbols = symbolsKey ? symbolsKey.split(',') : [];
    if (symbols.length === 0) {
      setSnapshots({});
      setLastRefresh(new Date());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWatchlistSnapshot(symbols);
      setSnapshots(data);
      setLastRefresh(new Date());
      if (active?.items.length) {
        const fired = evaluateWatchlistAlerts(active.items, data);
        if (fired.length) setAlertMessages((prev) => [...fired, ...prev].slice(0, 8));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  }, [symbolsKey, active?.items]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSnapshots();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refreshSnapshots]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm === 'unsupported' ? 'unsupported' : perm);
  };

  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    addList(name);
    setNewListName('');
    setShowNewList(false);
  };

  return (
    <PageLayout
      className="max-w-6xl"
      title={PAGE_COPY.watchlist.title}
      description={PAGE_COPY.watchlist.description}
    >
      <div className="space-y-4">
        {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
          <Alert variant="info" title="Browser alerts">
            Enable notifications to get BUY, SWOT, and pattern alerts when this page refreshes.{' '}
            <button type="button" className="underline font-medium" onClick={() => void handleEnableNotifications()}>
              Enable
            </button>
          </Alert>
        )}

        {alertMessages.length > 0 && (
          <Alert variant="info" title="Alerts fired">
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {alertMessages.map((msg, i) => (
                <li key={`${msg}-${i}`}>{msg}</li>
              ))}
            </ul>
            <button type="button" className="mt-2 text-xs underline" onClick={() => setAlertMessages([])}>
              Dismiss
            </button>
          </Alert>
        )}

        <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="input-field !w-auto text-sm"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.items.length})
                </option>
              ))}
            </select>
            {showNewList ? (
              <>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name"
                  className="input-field !w-auto text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                />
                <Button size="sm" onClick={handleCreateList}>
                  Create
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowNewList(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setShowNewList(true)}>
                New list
              </Button>
            )}
            {active && lists.length > 1 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (window.confirm(`Delete "${active.name}"?`)) removeList(active.id);
                }}
              >
                Delete list
              </Button>
            )}
            {active && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const name = window.prompt('Rename list', active.name);
                  if (name?.trim()) renameList(active.id, name.trim());
                }}
              >
                Rename
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button size="sm" onClick={() => void refreshSnapshots()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {!active?.items.length && (
          <div className="card p-10 text-center">
            <p className="text-ink-muted dark:text-ink-dark-muted text-sm">{PAGE_COPY.watchlist.empty}</p>
          </div>
        )}

        {active && active.items.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="p-3 text-left font-semibold">Stock</th>
                    <th className="p-3 text-right font-semibold">CMP</th>
                    <th className="p-3 text-right font-semibold">1D %</th>
                    <th className="p-3 text-right font-semibold">Signal</th>
                    <th className="p-3 text-right font-semibold">Buy</th>
                    <th className="p-3 text-right font-semibold">% vs Buy</th>
                    <th className="p-3 text-right font-semibold">Pattern</th>
                    <th className="p-3 text-right font-semibold">SWOT</th>
                    <th className="p-3 text-center font-semibold">Today</th>
                    <th className="p-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.items.map((item) => {
                    const snap = snapshots[item.symbol];
                    const isExpanded = expanded === item.symbol;
                    return (
                      <Fragment key={item.symbol}>
                        <tr className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3">
                            <button type="button" className="text-left" onClick={() => viewStock(item.symbol)}>
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                {snap?.shortName ?? item.shortName}
                              </p>
                              <p className="text-[11px] text-gray-400">{item.symbol}</p>
                            </button>
                          </td>
                          <td className="p-3 text-right font-mono">
                            {snap?.currentPrice ? fmtNumber(snap.currentPrice) : '—'}
                          </td>
                          <td
                            className={`p-3 text-right font-mono text-xs ${
                              snap?.changePercent == null
                                ? 'text-gray-500'
                                : snap.changePercent >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {fmtQuotePct(snap?.changePercent ?? null)}
                          </td>
                          <td className="p-3 text-right">{snap ? <SignalBadge signal={snap.signal} /> : '—'}</td>
                          <td className="p-3 text-right font-mono">
                            {snap?.buyPrice ? fmtNumber(snap.buyPrice) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {snap?.buyPrice && snap.currentPrice
                              ? fmtDistPct(snap.currentPrice, snap.buyPrice)
                              : '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                            {snap?.patternDate ?? '—'}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {snap?.swotStrengths != null && snap.swotWeaknesses != null ? (
                              <span className={snap.swotHealthy ? 'text-emerald-600' : 'text-red-600'}>
                                {snap.swotStrengths}/{snap.swotWeaknesses}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {snap?.patternToday ? (
                              <span className="text-[10px] font-bold uppercase text-emerald-600">Yes</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-xs text-blue-600 dark:text-blue-400"
                                onClick={() => setExpanded(isExpanded ? null : item.symbol)}
                              >
                                {isExpanded ? 'Hide' : 'Thesis'}
                              </button>
                              <button
                                type="button"
                                className="text-xs text-red-600 dark:text-red-400"
                                onClick={() => removeSymbol(item.symbol)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10}>
                              <ThesisPanel item={item} onPatch={(patch) => patchItem(item.symbol, patch)} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
