import { useState, useEffect, useRef } from 'react';

interface Suggestion {
  symbol: string;
  shortname: string;
  exchange: string;
}

interface AddTransactionModalProps {
  onAdd: (data: {
    symbol: string;
    stockName: string;
    type: 'BUY' | 'SELL';
    qty: number;
    price: number;
    date: string;
  }) => void;
  onClose: () => void;
  maxSellQty?: Record<string, number>;
}

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

export function AddTransactionModal({ onAdd, onClose, maxSellQty = {} }: AddTransactionModalProps) {
  const [symbolInput, setSymbolInput] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [stockName, setStockName] = useState('');
  const [txnType, setTxnType] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSymbolInput(val);
    setSelectedSymbol('');
    setStockName('');
    fetchSuggestions(val);
  };

  const pickSuggestion = (s: Suggestion) => {
    setSymbolInput(s.symbol);
    setSelectedSymbol(s.symbol);
    setStockName(s.shortname);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const sym = selectedSymbol || (symbolInput.includes('.') ? symbolInput : `${symbolInput}.NS`);
    const qtyNum = parseInt(qty, 10);
    const priceNum = parseFloat(price);

    if (!sym) { setError('Select a stock symbol'); return; }
    if (!qtyNum || qtyNum <= 0) { setError('Enter a valid quantity'); return; }
    if (!priceNum || priceNum <= 0) { setError('Enter a valid price'); return; }

    if (txnType === 'SELL') {
      const maxQty = maxSellQty[sym] ?? 0;
      if (qtyNum > maxQty) {
        setError(`Cannot sell ${qtyNum} — only ${maxQty} held`);
        return;
      }
    }

    onAdd({
      symbol: sym,
      stockName: stockName || sym,
      type: txnType,
      qty: qtyNum,
      price: priceNum,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Add Transaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol */}
          <div ref={wrapperRef} className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Symbol</label>
            <input
              type="text"
              value={symbolInput}
              onChange={handleSymbolChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="e.g. RELIANCE, TCS"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showSuggestions && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.symbol}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex justify-between text-sm"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    <div>
                      <span className="font-semibold text-gray-800">{s.symbol}</span>
                      <span className="ml-2 text-gray-400 text-xs">{s.shortname}</span>
                    </div>
                    <span className="text-xs text-gray-400">{s.exchange === 'NSI' ? 'NSE' : 'BSE'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* BUY / SELL toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Type</label>
            <div className="flex gap-2">
              {(['BUY', 'SELL'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxnType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${
                    txnType === t
                      ? t === 'BUY'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Price / Share</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Add {txnType} Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
