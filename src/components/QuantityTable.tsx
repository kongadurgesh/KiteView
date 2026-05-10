interface QuantityTableProps {
  buyPrice: number;
}

interface AmountRange {
  min: number;
  max: number;
}

function getRanges(buyPrice: number): AmountRange[] {
  if (buyPrice >= 10000) {
    return [
      { min: 40000, max: 52500 },
      { min: 50000, max: 62500 },
    ];
  }
  if (buyPrice >= 7500) {
    return [
      { min: 40000, max: 50000 },
      { min: 50000, max: 60000 },
    ];
  }
  if (buyPrice >= 5000) {
    return [
      { min: 40000, max: 47500 },
      { min: 50000, max: 57500 },
    ];
  }
  if (buyPrice >= 2500) {
    return [
      { min: 42500, max: 46000 },
      { min: 52500, max: 56000 },
    ];
  }
  if (buyPrice >= 1000) {
    return [
      { min: 40000, max: 43000 },
      { min: 50000, max: 53000 },
    ];
  }
  return [
    { min: 40000, max: 41000 },
    { min: 50000, max: 51000 },
  ];
}

interface Row {
  qty: number;
  amount: number;
}

function getRows(buyPrice: number, range: AmountRange): Row[] {
  const minQty = Math.ceil(range.min / buyPrice);
  const maxQty = Math.floor(range.max / buyPrice);
  const rows: Row[] = [];
  for (let q = minQty; q <= maxQty; q++) {
    rows.push({ qty: q, amount: parseFloat((q * buyPrice).toFixed(2)) });
  }
  return rows;
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function QuantityTable({ buyPrice }: QuantityTableProps) {
  const ranges = getRanges(buyPrice);

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
        Quantity &amp; Investment
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ranges.map((range) => {
          const rows = getRows(buyPrice, range);
          return (
            <div
              key={range.min}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {formatCurrency(range.min)} &ndash; {formatCurrency(range.max)}
                </p>
              </div>
              {rows.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic">No quantity fits this range</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                      <th className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 font-medium">Required Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.qty} className="border-b border-gray-50 dark:border-gray-700 last:border-b-0">
                        <td className="px-4 py-2 font-mono font-semibold text-gray-800 dark:text-gray-200">{row.qty}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
