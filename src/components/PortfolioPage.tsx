import { useState, useEffect, useCallback } from 'react';
import { Portfolio, Transaction } from '../types';
import { loadPortfolio, savePortfolio, addTransaction, getPositions, removePosition } from '../utils/portfolio';
import { fetchBatchQuotes } from '../utils/fetchStockData';
import { AddTransactionModal } from './AddTransactionModal';
import { TransactionHistory } from './TransactionHistory';

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(loadPortfolio);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const positions = getPositions(portfolio);
  const activePositions = positions.filter((p) => p.totalQty > 0);

  const refreshPrices = useCallback(async () => {
    const symbols = activePositions.map((p) => p.symbol);
    if (symbols.length === 0) return;
    setLoadingPrices(true);
    try {
      const prices = await fetchBatchQuotes(symbols);
      setLivePrices(prices);
    } finally {
      setLoadingPrices(false);
    }
  }, [activePositions.map((p) => p.symbol).join(',')]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

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
  const totalPnl = totalUnrealizedPnl + totalRealizedPnl;

  return (
    <div className="w-full max-w-5xl mt-10 space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Portfolio</h2>
          <div className="flex gap-2">
            <button
              onClick={refreshPrices}
              disabled={loadingPrices}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loadingPrices ? 'Refreshing...' : 'Refresh Prices'}
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {activePositions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="Invested" value={fmt(totalInvested)} />
            <SummaryCard label="Current Value" value={fmt(totalCurrentValue)} />
            <SummaryCard
              label="Unrealized P&L"
              value={`${totalUnrealizedPnl >= 0 ? '+' : ''}${fmt(totalUnrealizedPnl)}`}
              valueColor={totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <SummaryCard
              label="Total P&L"
              value={`${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}`}
              valueColor={totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}
              sub={totalRealizedPnl !== 0
                ? `Realized: ${totalRealizedPnl >= 0 ? '+' : ''}${fmt(totalRealizedPnl)}`
                : undefined}
            />
          </div>
        )}
      </div>

      {/* Positions */}
      {positions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No positions yet. Add a transaction to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const lp = livePrices[pos.symbol];
            const currentValue = lp ? lp * pos.totalQty : 0;
            const unrealized = lp ? (lp - pos.avgBuyPrice) * pos.totalQty : 0;
            const unrealizedPct = pos.investedAmount > 0 && lp
              ? ((unrealized / pos.investedAmount) * 100).toFixed(2)
              : '0.00';
            const isExpanded = expandedSymbol === pos.symbol;
            const isClosed = pos.totalQty === 0;

            return (
              <div
                key={pos.symbol}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  isClosed ? 'border-gray-100 opacity-60' : 'border-gray-200'
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSymbol(isExpanded ? null : pos.symbol)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-bold text-gray-900">{pos.stockName}</p>
                        <p className="text-xs text-gray-400">{pos.symbol}</p>
                      </div>
                      {isClosed && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-200 text-gray-500">
                          Closed
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {!isClosed && (
                        <>
                          <MiniStat label="Qty" value={String(pos.totalQty)} />
                          <MiniStat label="Avg Buy" value={fmt(pos.avgBuyPrice)} />
                          {lp ? (
                            <MiniStat label="CMP" value={fmt(lp)} />
                          ) : (
                            <MiniStat label="CMP" value={loadingPrices ? '...' : '—'} />
                          )}
                          <MiniStat label="Invested" value={fmt(pos.investedAmount)} />
                          {lp && (
                            <MiniStat label="Current" value={fmt(currentValue)} />
                          )}
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">P&L</p>
                            <p className={`font-bold font-mono ${unrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {unrealized >= 0 ? '+' : ''}{fmt(unrealized)}
                              <span className="text-xs font-normal ml-1">({unrealizedPct}%)</span>
                            </p>
                          </div>
                        </>
                      )}
                      {pos.realizedPnl !== 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Realized</p>
                          <p className={`font-bold font-mono ${pos.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pos.realizedPnl >= 0 ? '+' : ''}{fmt(pos.realizedPnl)}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(pos.symbol); }}
                        className="ml-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove position"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <span className="text-gray-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <TransactionHistory transactions={pos.transactions} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddTransactionModal
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
          maxSellQty={maxSellQty}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, valueColor, sub }: {
  label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${valueColor ?? 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="font-mono font-semibold text-gray-700">{value}</p>
    </div>
  );
}
