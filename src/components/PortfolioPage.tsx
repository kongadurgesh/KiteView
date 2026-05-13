import { useState, useEffect, useCallback, useMemo } from 'react';
import { Portfolio, Position, Transaction } from '../types';
import { loadPortfolio, savePortfolio, addTransaction, getPositions, removePosition, clearPortfolio } from '../utils/portfolio';
import { fetchBatchQuotesDetailed } from '../utils/fetchStockData';
import { AddTransactionModal } from './AddTransactionModal';
import { ImportExcelModal } from './ImportExcelModal';
import { TransactionHistory } from './TransactionHistory';
import { PerformanceChart } from './PerformanceChart';
import { RiskDashboard } from './RiskDashboard';
import { DividendDashboard } from './DividendDashboard';

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type SortKey = 'name' | 'qty' | 'avgBuy' | 'cmp' | 'invested' | 'current' | 'pnl' | 'pnlPct';
type SortDir = 'asc' | 'desc';

interface PositionRow {
  pos: Position;
  cmp: number;
  currentValue: number;
  unrealized: number;
  unrealizedPct: number;
  isClosed: boolean;
}

function buildRow(pos: Position, livePrices: Record<string, number>): PositionRow {
  const cmp = livePrices[pos.symbol] ?? 0;
  const currentValue = cmp * pos.totalQty;
  const unrealized = cmp ? (cmp - pos.avgBuyPrice) * pos.totalQty : 0;
  const unrealizedPct = pos.investedAmount > 0 && cmp
    ? (unrealized / pos.investedAmount) * 100
    : 0;
  return { pos, cmp, currentValue, unrealized, unrealizedPct, isClosed: pos.totalQty === 0 };
}

function getSortValue(row: PositionRow, key: SortKey): number | string {
  switch (key) {
    case 'name': return row.pos.stockName.toLowerCase();
    case 'qty': return row.pos.totalQty;
    case 'avgBuy': return row.pos.avgBuyPrice;
    case 'cmp': return row.cmp;
    case 'invested': return row.pos.investedAmount;
    case 'current': return row.currentValue;
    case 'pnl': return row.unrealized;
    case 'pnlPct': return row.unrealizedPct;
  }
}

export function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(loadPortfolio);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [livePrevClose, setLivePrevClose] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const positions = getPositions(portfolio);
  const activePositions = positions.filter((p) => p.totalQty > 0);

  const refreshPrices = useCallback(async () => {
    const symbols = activePositions.map((p) => p.symbol);
    if (symbols.length === 0) return;
    setLoadingPrices(true);
    try {
      const detailed = await fetchBatchQuotesDetailed(symbols);
      const prices: Record<string, number> = {};
      const prevClose: Record<string, number> = {};
      for (const [sym, data] of Object.entries(detailed)) {
        prices[sym] = data.price;
        prevClose[sym] = data.previousClose;
      }
      setLivePrices(prices);
      setLivePrevClose(prevClose);
    } finally {
      setLoadingPrices(false);
    }
  }, [activePositions.map((p) => p.symbol).join(',')]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  const rows: PositionRow[] = useMemo(() => {
    const built = positions.map((p) => buildRow(p, livePrices));
    built.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp = 0;
      if (typeof va === 'string' && typeof vb === 'string') cmp = va.localeCompare(vb);
      else cmp = (va as number) - (vb as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return built;
  }, [positions, livePrices, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleAdd = (data: {
    symbol: string; stockName: string; type: 'BUY' | 'SELL';
    qty: number; price: number; date: string;
  }) => {
    const txn: Transaction = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now(),
    };
    try {
      const updated = addTransaction(portfolio, txn);
      setPortfolio(updated);
      savePortfolio(updated);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  const handleRemove = (symbol: string) => {
    if (!confirm(`Remove ${symbol} and all its transactions?`)) return;
    const updated = removePosition(portfolio, symbol);
    setPortfolio(updated);
    savePortfolio(updated);
    setExpandedSymbol(null);
  };

  const handleImportRows = (importedRows: { symbol: string; stockName: string; qty: number; price: number }[]) => {
    let updated = portfolio;
    for (const row of importedRows) {
      const txn: Transaction = {
        id: crypto.randomUUID(),
        symbol: row.symbol,
        stockName: row.stockName,
        type: 'BUY',
        qty: row.qty,
        price: row.price,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
      };
      updated = addTransaction(updated, txn);
    }
    setPortfolio(updated);
    savePortfolio(updated);
    setShowImport(false);
  };

  const handleClearPortfolio = () => {
    if (!confirm('Delete entire portfolio? This will remove all positions and transaction history.')) return;
    const empty = clearPortfolio();
    setPortfolio(empty);
    setLivePrices({});
    setExpandedSymbol(null);
  };

  const maxSellQty: Record<string, number> = {};
  for (const p of positions) {
    if (p.totalQty > 0) maxSellQty[p.symbol] = p.totalQty;
  }

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalRealizedPnl = 0;
  for (const p of activePositions) {
    totalInvested += p.investedAmount;
    const lp = livePrices[p.symbol];
    if (lp) totalCurrentValue += lp * p.totalQty;
    else totalCurrentValue += p.investedAmount;
  }
  for (const p of positions) {
    totalRealizedPnl += p.realizedPnl;
  }
  const totalUnrealizedPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0
    ? ((totalUnrealizedPnl + totalRealizedPnl) / totalInvested) * 100
    : 0;

  let todayPnl = 0;
  let totalPrevValue = 0;
  for (const p of activePositions) {
    const price = livePrices[p.symbol];
    const prevClose = livePrevClose[p.symbol];
    if (price && prevClose) {
      todayPnl += (price - prevClose) * p.totalQty;
      totalPrevValue += prevClose * p.totalQty;
    }
  }
  const todayPnlPct = totalPrevValue > 0 ? (todayPnl / totalPrevValue) * 100 : 0;

  return (
    <div className="w-full max-w-6xl mt-10 space-y-6">
      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Portfolio</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshPrices}
              disabled={loadingPrices}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loadingPrices ? 'Refreshing...' : 'Refresh Prices'}
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Import Excel
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              + Add Transaction
            </button>
            {positions.length > 0 && (
              <button
                onClick={handleClearPortfolio}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                Delete Portfolio
              </button>
            )}
          </div>
        </div>

        {activePositions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <SummaryCard label="Invested" value={fmt(totalInvested)} />
            <SummaryCard label="Current Value" value={fmt(totalCurrentValue)} />
            <SummaryCard
              label="Total P&L"
              value={`${totalUnrealizedPnl >= 0 ? '+' : ''}${fmt(totalUnrealizedPnl)}`}
              valueColor={totalUnrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
              sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%${totalRealizedPnl !== 0 ? ` · Realized: ${totalRealizedPnl >= 0 ? '+' : ''}${fmt(totalRealizedPnl)}` : ''}`}
            />
            <SummaryCard
              label="Day's P&L"
              value={`${todayPnl >= 0 ? '+' : ''}${fmt(todayPnl)}`}
              valueColor={todayPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
              sub={`${todayPnlPct >= 0 ? '+' : ''}${todayPnlPct.toFixed(2)}%`}
            />
          </div>
        )}
      </div>

      {/* Performance Chart */}
      <PerformanceChart portfolio={portfolio} />

      {/* Risk Dashboard */}
      <RiskDashboard portfolio={portfolio} livePrices={livePrices} />

      {/* Dividend Dashboard */}
      <DividendDashboard portfolio={portfolio} livePrices={livePrices} />

      {/* Positions Table */}
      {positions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">No positions yet. Add a transaction to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <SortHeader label="Stock" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} align="left" />
                  <SortHeader label="Qty" sortKey="qty" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Avg Buy" sortKey="avgBuy" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="CMP" sortKey="cmp" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Invested" sortKey="invested" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Current" sortKey="current" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="P&L" sortKey="pnl" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="P&L %" sortKey="pnlPct" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-3 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ pos, cmp, currentValue, unrealized, unrealizedPct, isClosed }) => {
                  const isExpanded = expandedSymbol === pos.symbol;
                  return (
                    <PositionTableRow
                      key={pos.symbol}
                      pos={pos}
                      cmp={cmp}
                      currentValue={currentValue}
                      unrealized={unrealized}
                      unrealizedPct={unrealizedPct}
                      isClosed={isClosed}
                      isExpanded={isExpanded}
                      loadingPrices={loadingPrices}
                      onToggle={() => setExpandedSymbol(isExpanded ? null : pos.symbol)}
                      onRemove={() => handleRemove(pos.symbol)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddTransactionModal
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
          maxSellQty={maxSellQty}
        />
      )}

      {showImport && (
        <ImportExcelModal
          onImport={handleImportRows}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

function PositionTableRow({ pos, cmp, currentValue, unrealized, unrealizedPct, isClosed, isExpanded, loadingPrices, onToggle, onRemove }: {
  pos: Position; cmp: number; currentValue: number; unrealized: number; unrealizedPct: number;
  isClosed: boolean; isExpanded: boolean; loadingPrices: boolean;
  onToggle: () => void; onRemove: () => void;
}) {
  const pnlColor = unrealized >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <>
      <tr
        className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isClosed ? 'opacity-50' : ''}`}
        onClick={onToggle}
      >
        <td className="px-3 py-3 text-left">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[160px]">{pos.stockName}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{pos.symbol}</p>
          {isClosed && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400">Closed</span>
          )}
        </td>
        <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{isClosed ? '—' : pos.totalQty}</td>
        <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{isClosed ? '—' : fmt(pos.avgBuyPrice)}</td>
        <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
          {isClosed ? '—' : cmp ? fmt(cmp) : (loadingPrices ? '...' : '—')}
        </td>
        <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{isClosed ? '—' : fmt(pos.investedAmount)}</td>
        <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-gray-300">{isClosed ? '—' : cmp ? fmt(currentValue) : '—'}</td>
        <td className={`px-3 py-3 text-right font-mono font-semibold ${isClosed ? 'text-gray-400 dark:text-gray-500' : pnlColor}`}>
          {isClosed ? '—' : `${unrealized >= 0 ? '+' : ''}${fmt(unrealized)}`}
        </td>
        <td className={`px-3 py-3 text-right font-mono font-semibold ${isClosed ? 'text-gray-400 dark:text-gray-500' : pnlColor}`}>
          {isClosed ? '—' : `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(2)}%`}
        </td>
        <td className="px-3 py-3 text-center">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
              title="Remove position"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <span className="text-gray-300 dark:text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <TransactionHistory transactions={pos.transactions} />
          </td>
        </tr>
      )}
    </>
  );
}

function SortHeader({ label, sortKey, current, dir, onSort, align = 'right' }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (key: SortKey) => void; align?: 'left' | 'right';
}) {
  const isActive = current === sortKey;
  return (
    <th
      className={`px-3 py-3 font-medium text-xs uppercase tracking-wider cursor-pointer select-none whitespace-nowrap
        ${align === 'left' ? 'text-left' : 'text-right'}
        ${isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );
}

function SummaryCard({ label, value, valueColor, sub }: {
  label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueColor ?? 'text-gray-800 dark:text-gray-200'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
