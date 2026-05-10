import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  isLoading: boolean;
}

interface Suggestion {
  symbol: string;
  shortname: string;
  exchange: string;
}

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${PROXY_BASE}/api/search?q=${encodeURIComponent(query)}`);
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(true);
        setNoResults(data.length === 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
        setNoResults(false);
      }
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInput(val);
    fetchSuggestions(val);
  };

  const selectSymbol = (symbol: string) => {
    setInput(symbol);
    setShowDropdown(false);
    setSuggestions([]);
    onSearch(symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    const finalSymbol = trimmed.includes('.') ? trimmed : `${trimmed}.NS`;
    onSearch(finalSymbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSymbol(suggestions[activeIdx].symbol);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="Search stock (e.g. NALCO, RELIANCE, TCS)"
          className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 dark:placeholder:text-gray-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold text-base
                     hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {isLoading ? 'Scanning...' : 'Scan'}
        </button>
      </form>

      {showDropdown && (
        <ul className="absolute z-10 left-0 right-16 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {noResults ? (
            <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic">
              No match found. Try the full name (e.g. "National Aluminium" for NALCO).
            </li>
          ) : (
            suggestions.map((s, idx) => (
              <li
                key={s.symbol}
                className={`px-4 py-2.5 cursor-pointer flex justify-between items-center text-sm
                  ${idx === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                onMouseDown={() => selectSymbol(s.symbol)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{s.symbol}</span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">{s.shortname}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">{s.exchange === 'NSI' ? 'NSE' : 'BSE'}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
