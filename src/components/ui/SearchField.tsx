import { useState, useEffect, useRef, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export interface SearchSuggestion {
  symbol: string;
  shortname: string;
  exchange: string;
}

const PROXY_BASE = import.meta.env.DEV ? 'http://localhost:3006' : '';

interface SearchFieldProps {
  onSelect: (symbol: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  maxWidth?: string;
  className?: string;
}

export function SearchField({
  onSelect,
  isLoading = false,
  placeholder = 'Search stock (e.g. NALCO, RELIANCE)',
  submitLabel = 'Scan',
  loadingLabel = 'Scanning…',
  maxWidth = 'max-w-lg',
  className,
}: SearchFieldProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
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
        const data: SearchSuggestion[] = await res.json();
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

  const selectSymbol = (symbol: string) => {
    setInput(symbol);
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(symbol);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setShowDropdown(false);
    const finalSymbol = trimmed.includes('.') ? trimmed : `${trimmed}.NS`;
    onSelect(finalSymbol);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
    <div ref={wrapperRef} className={cn('relative w-full', maxWidth, className)}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value.toUpperCase();
            setInput(val);
            fetchSuggestions(val);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="input-field flex-1"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </form>

      {showDropdown && (
        <ul className="absolute z-20 left-0 right-0 mt-1 card max-h-64 overflow-y-auto py-1">
          {noResults ? (
            <li className="px-4 py-3 text-sm text-ink-muted italic">No matches. Try the company name.</li>
          ) : (
            suggestions.map((s, idx) => (
              <li
                key={s.symbol}
                className={cn(
                  'px-4 py-2.5 cursor-pointer flex justify-between items-center text-sm',
                  idx === activeIdx
                    ? 'bg-accent-muted dark:bg-accent-dark-muted'
                    : 'hover:bg-surface-muted dark:hover:bg-surface-dark-muted',
                )}
                onMouseDown={() => selectSymbol(s.symbol)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <div>
                  <span className="font-semibold text-ink-primary dark:text-ink-dark-primary">{s.symbol}</span>
                  <span className="ml-2 text-ink-muted text-xs">{s.shortname}</span>
                </div>
                <span className="text-xs text-ink-muted">{s.exchange === 'NSI' ? 'NSE' : 'BSE'}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
