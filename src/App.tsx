import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { fetchStockData, fetchMarketCap } from './utils/fetchStockData';
import { detectPattern } from './utils/patternDetector';
import { PatternMatch } from './types';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<PatternMatch | null>(null);
  const [stockName, setStockName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [noMatch, setNoMatch] = useState(false);

  const handleSearch = async (sym: string) => {
    setIsLoading(true);
    setError(null);
    setMatch(null);
    setNoMatch(false);
    setSymbol(sym);

    try {
      const stockInfo = await fetchStockData(sym);
      setStockName(stockInfo.shortName);
      setCurrentPrice(stockInfo.currentPrice);

      let marketCapCr = stockInfo.marketCap;
      if (marketCapCr === 0) {
        marketCapCr = await fetchMarketCap(sym);
      }

      const result = detectPattern(stockInfo.candles, marketCapCr);

      if (result) {
        setMatch(result);
      } else {
        setNoMatch(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Bullish Pattern Buy Price Calculator
        </h1>
      </div>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {isLoading && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Fetching data & scanning for pattern...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 max-w-lg w-full rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-700 text-sm font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {noMatch && !isLoading && (
        <div className="mt-8 max-w-lg w-full rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-amber-700 text-sm font-medium">No Pattern Found</p>
          <p className="text-amber-600 text-sm mt-1">
            No Bullish Harami or Bullish Engulfing pattern was detected for <strong>{symbol}</strong> in the last 1 year of data.
          </p>
        </div>
      )}

      {match && !isLoading && (
        <ResultCard match={match} stockName={stockName} symbol={symbol} currentPrice={currentPrice} />
      )}
    </div>
  );
}

export default App;
