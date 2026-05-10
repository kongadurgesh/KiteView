import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ImportRow {
  isin: string;
  buyPrice: number;
  qty: number;
  symbol: string;
  stockName: string;
  status: 'pending' | 'resolving' | 'resolved' | 'failed';
}

interface ImportExcelModalProps {
  onImport: (rows: { symbol: string; stockName: string; qty: number; price: number }[]) => void;
  onClose: () => void;
}

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

const ISIN_HEADERS = ['isin', 'isin_code', 'isin code'];
const PRICE_HEADERS = ['buy price', 'avg price', 'price', 'buy_price', 'avg_price', 'average price', 'buy avg', 'buy avg.'];
const QTY_HEADERS = ['quantity', 'qty', 'shares', 'units', 'holding qty'];

function matchHeader(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim();
  return patterns.some((p) => h === p || h.includes(p));
}

function detectColumns(headers: string[]): { isinCol: number; priceCol: number; qtyCol: number } {
  let isinCol = -1, priceCol = -1, qtyCol = -1;
  for (let i = 0; i < headers.length; i++) {
    if (isinCol === -1 && matchHeader(headers[i], ISIN_HEADERS)) isinCol = i;
    if (priceCol === -1 && matchHeader(headers[i], PRICE_HEADERS)) priceCol = i;
    if (qtyCol === -1 && matchHeader(headers[i], QTY_HEADERS)) qtyCol = i;
  }
  return { isinCol, priceCol, qtyCol };
}

async function resolveIsin(isin: string): Promise<{ symbol: string; shortname: string } | null> {
  try {
    const res = await fetch(`${PROXY_BASE}/api/search?q=${encodeURIComponent(isin)}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { symbol: data[0].symbol, shortname: data[0].shortname };
    }
    return null;
  } catch {
    return null;
  }
}

export function ImportExcelModal({ onImport, onClose }: ImportExcelModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResolved(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        if (json.length < 2) { setError('File has no data rows'); return; }

        const headers = (json[0] as string[]).map(String);
        const { isinCol, priceCol, qtyCol } = detectColumns(headers);

        if (isinCol === -1) { setError(`Could not find ISIN column. Headers found: ${headers.join(', ')}`); return; }
        if (priceCol === -1) { setError(`Could not find Buy Price column. Headers found: ${headers.join(', ')}`); return; }
        if (qtyCol === -1) { setError(`Could not find Quantity column. Headers found: ${headers.join(', ')}`); return; }

        const parsed: ImportRow[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as string[];
          const isin = String(row[isinCol] ?? '').trim();
          const price = parseFloat(String(row[priceCol] ?? ''));
          const qty = parseInt(String(row[qtyCol] ?? ''), 10);
          if (!isin || isNaN(price) || isNaN(qty) || qty <= 0 || price <= 0) continue;
          parsed.push({ isin, buyPrice: price, qty, symbol: '', stockName: '', status: 'pending' });
        }

        if (parsed.length === 0) { setError('No valid rows found in the file'); return; }
        setRows(parsed);
      } catch {
        setError('Failed to parse file. Make sure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResolve = async () => {
    setResolving(true);
    const cache: Record<string, { symbol: string; shortname: string } | null> = {};
    const uniqueIsins = [...new Set(rows.map((r) => r.isin))];

    setRows((prev) => prev.map((r) => ({ ...r, status: 'resolving' as const })));

    for (const isin of uniqueIsins) {
      const result = await resolveIsin(isin);
      cache[isin] = result;
      setRows((prev) =>
        prev.map((r) =>
          r.isin === isin
            ? {
                ...r,
                symbol: result?.symbol ?? '',
                stockName: result?.shortname ?? '',
                status: result ? 'resolved' : 'failed',
              }
            : r
        )
      );
      await new Promise((r) => setTimeout(r, 200));
    }

    setResolving(false);
    setResolved(true);
  };

  const resolvedRows = rows.filter((r) => r.status === 'resolved');
  const failedRows = rows.filter((r) => r.status === 'failed');

  const handleImport = () => {
    onImport(
      resolvedRows.map((r) => ({
        symbol: r.symbol,
        stockName: r.stockName,
        qty: r.qty,
        price: r.buyPrice,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Import from Excel</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload an Excel file (.xlsx, .xls, .csv) with columns for <strong>ISIN</strong>, <strong>Buy Price</strong>, and <strong>Quantity</strong>.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                {rows.length} row{rows.length > 1 ? 's' : ''} found
                {resolved && (
                  <span>
                    {' '}&mdash; <span className="text-green-600 dark:text-green-400 font-semibold">{resolvedRows.length} resolved</span>
                    {failedRows.length > 0 && (
                      <span className="text-red-500 dark:text-red-400 font-semibold">, {failedRows.length} failed</span>
                    )}
                  </span>
                )}
              </p>
              {!resolved && (
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {resolving ? 'Resolving...' : 'Resolve ISINs'}
                </button>
              )}
              {resolved && resolvedRows.length > 0 && (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Import {resolvedRows.length} Holdings
                </button>
              )}
            </div>

            <div className="overflow-auto flex-1 border border-gray-200 dark:border-gray-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                  <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">ISIN</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Buy Price</th>
                    <th className="px-3 py-2 text-left font-medium">Symbol</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 dark:border-gray-700">
                      <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 text-xs">{r.isin}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{r.qty}</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">{r.buyPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">{r.symbol || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs truncate max-w-[150px]">{r.stockName || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportRow['status'] }) {
  const styles = {
    pending: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    resolving: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    resolved: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    failed: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };
  const labels = { pending: 'Pending', resolving: 'Resolving...', resolved: 'Resolved', failed: 'Failed' };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
