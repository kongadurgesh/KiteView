import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { PortfolioPage } from './components/PortfolioPage';
import { fetchStockData, fetchStockMeta, fetchAllTimeHigh } from './utils/fetchStockData';
import { detectPattern } from './utils/patternDetector';
import { PatternMatch } from './types';

type Tab = 'scanner' | 'portfolio';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scanner');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<PatternMatch | null>(null);
  const [stockName, setStockName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [fiftyTwoWeekHigh, setFiftyTwoWeekHigh] = useState(0);
  const [fiftyTwoWeekLow, setFiftyTwoWeekLow] = useState(0);
  const [allTimeHigh, setAllTimeHigh] = useState(0);
  const [marketCapCr, setMarketCapCr] = useState(0);
  const [sector, setSector] = useState('');
  const [industry, setIndustry] = useState('');
  const [noMatch, setNoMatch] = useState(false);

  const handleSearch = async (sym: string) => {
    setIsLoading(true);
    setError(null);
    setMatch(null);
    setNoMatch(false);
    setSymbol(sym);

    try {
      const [stockInfo, ath, meta] = await Promise.all([
        fetchStockData(sym),
        fetchAllTimeHigh(sym),
        fetchStockMeta(sym),
      ]);
      setStockName(stockInfo.shortName);
      setCurrentPrice(stockInfo.currentPrice);
      setFiftyTwoWeekHigh(stockInfo.fiftyTwoWeekHigh);
      setFiftyTwoWeekLow(stockInfo.fiftyTwoWeekLow);
      setAllTimeHigh(ath);
      setSector(meta.sector);
      setIndustry(meta.industry);

      const mcCr = stockInfo.marketCap > 0 ? stockInfo.marketCap : meta.marketCapCr;
      setMarketCapCr(mcCr);

      const result = detectPattern(stockInfo.candles, mcCr);

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Kite<span className="text-blue-600">View</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">A soaring view of the markets</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-8">
        {([['scanner', 'Scanner'], ['portfolio', 'Portfolio']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'scanner' && (
        <>
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
            <ResultCard
              match={match}
              stockName={stockName}
              symbol={symbol}
              currentPrice={currentPrice}
              fiftyTwoWeekHigh={fiftyTwoWeekHigh}
              fiftyTwoWeekLow={fiftyTwoWeekLow}
              allTimeHigh={allTimeHigh}
              marketCapCr={marketCapCr}
              sector={sector}
              industry={industry}
            />
          )}
        </>
      )}

      {activeTab === 'portfolio' && <PortfolioPage />}

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
