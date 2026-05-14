import { Transaction } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const sorted = transactions.toSorted((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-2 text-left font-medium">Date</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-right font-medium">Qty</th>
            <th className="px-4 py-2 text-right font-medium">Price</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} className="border-t border-gray-200 dark:border-gray-800">
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{t.date}</td>
              <td className="px-4 py-2">
                <span
                  className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    t.type === 'BUY'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {t.type}
                </span>
              </td>
              <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{t.qty}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(t.price)}</td>
              <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(t.qty * t.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
