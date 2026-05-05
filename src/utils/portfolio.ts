import { Portfolio, Position, Transaction } from '../types';

const STORAGE_KEY = 'bullish-portfolio';

export function loadPortfolio(): Portfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { positions: {} };
    return JSON.parse(raw) as Portfolio;
  } catch {
    return { positions: {} };
  }
}

export function savePortfolio(p: Portfolio): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function getPositions(portfolio: Portfolio): Position[] {
  return Object.values(portfolio.positions).sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );
}

export function addTransaction(
  portfolio: Portfolio,
  txn: Transaction
): Portfolio {
  const key = txn.symbol;
  const existing = portfolio.positions[key];

  if (txn.type === 'BUY') {
    if (existing) {
      const newTotalQty = existing.totalQty + txn.qty;
      const newInvested = existing.investedAmount + txn.qty * txn.price;
      return {
        positions: {
          ...portfolio.positions,
          [key]: {
            ...existing,
            totalQty: newTotalQty,
            investedAmount: newInvested,
            avgBuyPrice: parseFloat((newInvested / newTotalQty).toFixed(2)),
            transactions: [...existing.transactions, txn],
          },
        },
      };
    }
    const pos: Position = {
      symbol: txn.symbol,
      stockName: txn.stockName,
      avgBuyPrice: txn.price,
      totalQty: txn.qty,
      investedAmount: txn.qty * txn.price,
      realizedPnl: 0,
      transactions: [txn],
    };
    return { positions: { ...portfolio.positions, [key]: pos } };
  }

  // SELL
  if (!existing || existing.totalQty < txn.qty) {
    throw new Error(`Cannot sell ${txn.qty} shares — only ${existing?.totalQty ?? 0} held`);
  }

  const sellProfit = (txn.price - existing.avgBuyPrice) * txn.qty;
  const newQty = existing.totalQty - txn.qty;
  const newInvested = existing.avgBuyPrice * newQty;

  if (newQty === 0) {
    const closedPos: Position = {
      ...existing,
      totalQty: 0,
      investedAmount: 0,
      realizedPnl: existing.realizedPnl + sellProfit,
      transactions: [...existing.transactions, txn],
    };
    return {
      positions: { ...portfolio.positions, [key]: closedPos },
    };
  }

  return {
    positions: {
      ...portfolio.positions,
      [key]: {
        ...existing,
        totalQty: newQty,
        investedAmount: parseFloat(newInvested.toFixed(2)),
        realizedPnl: existing.realizedPnl + sellProfit,
        transactions: [...existing.transactions, txn],
      },
    },
  };
}

export function removePosition(portfolio: Portfolio, symbol: string): Portfolio {
  const { [symbol]: _, ...rest } = portfolio.positions;
  return { positions: rest };
}
