import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { PortfolioPage } from './components/PortfolioPage';
import { ScreenerPage } from './components/ScreenerPage';
import { HeatmapPage } from './components/HeatmapPage';
import { StockComparePage } from './components/StockComparePage';
import { AboutPage } from './components/AboutPage';
import { fetchStockData, fetchStockMeta, fetchAllTimeHigh } from './utils/fetchStockData';
import { detectPattern } from './utils/patternDetector';
import { initTheme, cycleTheme, getTheme } from './utils/theme';
import { PatternMatch } from './types';

type Tab = 'screener' | 'heatmap' | 'lookup' | 'portfolio';

function App() {
  const [themePref, setThemePref] = useState(getTheme);
  useEffect(() => { initTheme(); }, []);

  const [activeTab, setActiveTab] = useState<Tab>('screener');
  const [compareMode, setCompareMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center px-4 py-8">
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Kite<span className="text-blue-600 dark:text-blue-400">View</span>
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">A soaring view of the markets</p>
        </div>
        <button
          onClick={() => setThemePref(cycleTheme())}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Theme: ${themePref}`}
        >
          {themePref === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : themePref === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {showAbout ? (
        <AboutPage onBack={() => setShowAbout(false)} />
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-1 mb-8">
            {([['screener', 'Screener'], ['heatmap', 'Heatmap'], ['lookup', 'Lookup'], ['portfolio', 'Portfolio']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: activeTab === 'screener' ? undefined : 'none' }} className="w-full flex flex-col items-center">
            <ScreenerPage
              onViewStock={(sym) => {
                setActiveTab('lookup');
                handleSearch(sym);
              }}
            />
          </div>

          <div style={{ display: activeTab === 'heatmap' ? undefined : 'none' }} className="w-full flex flex-col items-center">
            <HeatmapPage
              onViewStock={(sym) => {
                setActiveTab('lookup');
                handleSearch(sym);
              }}
            />
          </div>

          <div style={{ display: activeTab === 'lookup' ? undefined : 'none' }} className="w-full flex flex-col items-center">
            <div className="flex items-center gap-3 w-full max-w-lg mb-4">
              <button
                onClick={() => setCompareMode(false)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${!compareMode ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Scan
              </button>
              <button
                onClick={() => setCompareMode(true)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${compareMode ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                Compare
              </button>
            </div>

            {compareMode ? (
              <StockComparePage />
            ) : (
              <>
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />

                {isLoading && (
                  <div className="mt-12 flex flex-col items-center gap-3">
                    <div className="size-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Fetching data & scanning for pattern...</p>
                  </div>
                )}

                {error && (
                  <div className="mt-8 max-w-lg w-full rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
                    <p className="text-red-700 dark:text-red-400 text-sm font-medium">Error</p>
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                  </div>
                )}

                {noMatch && !isLoading && (
                  <div className="mt-8 max-w-lg w-full rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 text-center">
                    <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">No Pattern Found</p>
                    <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
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
          </div>

          <div style={{ display: activeTab === 'portfolio' ? undefined : 'none' }} className="w-full flex flex-col items-center">
            <PortfolioPage />
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-10 pb-4 text-center">
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          About the Manager
        </button>
      </footer>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
