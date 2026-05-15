import { useCallback, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Sidebar, Page } from './components/Sidebar';
import { MarketTicker } from './components/MarketTicker';
import { SearchBar } from './components/SearchBar';
import { ResultCard } from './components/ResultCard';
import { PortfolioPage } from './components/PortfolioPage';
import { ScreenerPage } from './components/ScreenerPage';
import { HeatmapPage } from './components/HeatmapPage';
import { StockComparePage } from './components/StockComparePage';
import { AboutPage } from './components/AboutPage';
import { OverviewPage } from './components/OverviewPage';
import { fetchLookupData } from './utils/fetchStockData';
import { detectPattern } from './utils/patternDetector';
import { initTheme, getTheme, toggleTheme } from './utils/theme';
import { PatternMatch } from './types';

function fmtInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function App() {
  const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
  useEffect(() => { initTheme(); }, []);

  const [activePage, setActivePage] = useState<Page>('overview');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compareSeedSymbol, setCompareSeedSymbol] = useState<string | null>(null);

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
  const [lastLookup, setLastLookup] = useState<{ symbol: string; name: string; price: number } | null>(null);

  const handleSearch = async (sym: string) => {
    setIsLoading(true);
    setError(null);
    setMatch(null);
    setNoMatch(false);
    setSymbol(sym);

    try {
      const { stockInfo, allTimeHigh: ath, meta } = await fetchLookupData(sym);
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
      setLastLookup({
        symbol: sym,
        name: stockInfo.shortName,
        price: stockInfo.currentPrice,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLookup = (sym: string) => {
    setActivePage('lookup');
    handleSearch(sym);
  };

  const handleCompareFromLookup = () => {
    if (!symbol) return;
    setCompareSeedSymbol(symbol);
    setActivePage('compare');
  };

  const handleSeedConsumed = useCallback(() => {
    setCompareSeedSymbol(null);
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setIsDark(next === 'dark');
  };

  const canRescan = Boolean(symbol) && !isLoading;

  const pageWrap = 'w-full max-w-7xl mx-auto flex flex-col items-center';

  const handlePageChange = (page: Page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        active={activePage}
        onChange={handlePageChange}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onExpandChange={setSidebarExpanded}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-16 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 h-12 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">KiteView</span>
        </header>

        <MarketTicker sidebarExpanded={sidebarExpanded} />

        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 flex flex-col items-center overflow-y-auto overflow-x-hidden min-w-0 w-full">
          <div style={{ display: activePage === 'overview' ? undefined : 'none' }} className={pageWrap}>
            <OverviewPage onNavigate={handlePageChange} />
          </div>

          {activePage === 'about' && (
            <div className={pageWrap}>
              <AboutPage />
            </div>
          )}

          <div style={{ display: activePage === 'screener' ? undefined : 'none' }} className={pageWrap}>
            <ScreenerPage onViewStock={navigateToLookup} />
          </div>

          <div style={{ display: activePage === 'heatmap' ? undefined : 'none' }} className={pageWrap}>
            <HeatmapPage onViewStock={navigateToLookup} isActive={activePage === 'heatmap'} />
          </div>

          <div style={{ display: activePage === 'lookup' ? undefined : 'none' }} className={`${pageWrap} max-w-5xl`}>
            <div className="w-full mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Pattern lookup</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-lg mx-auto">
                Scan NSE stocks for Bullish Harami or Bullish Engulfing with breakout. Shows buy trigger, buy price, levels, and cap tier.
              </p>
            </div>

            {lastLookup && (
              <div className="w-full max-w-lg mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Last scan</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {lastLookup.name}{' '}
                    <span className="font-mono text-gray-500 dark:text-gray-400">({lastLookup.symbol})</span>
                  </p>
                  <p className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{fmtInr(lastLookup.price)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canRescan}
                    onClick={() => handleSearch(symbol)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    disabled={!symbol}
                    onClick={handleCompareFromLookup}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    Compare
                  </button>
                </div>
              </div>
            )}

            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {isLoading && (
              <div className="mt-12 flex flex-col items-center gap-3">
                <div className="size-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Fetching data & scanning for pattern...</p>
              </div>
            )}

            {error && (
              <div className="mt-8 max-w-lg w-full rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">Error</p>
                <p className="text-red-600 dark:text-red-400/80 text-sm mt-1">{error}</p>
              </div>
            )}

            {noMatch && !isLoading && (
              <div className="mt-8 max-w-lg w-full rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 text-center">
                <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">No Pattern Found</p>
                <p className="text-amber-600 dark:text-amber-400/80 text-sm mt-1">
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
          </div>

          <div style={{ display: activePage === 'compare' ? undefined : 'none' }} className={pageWrap}>
            <StockComparePage seedSymbol={compareSeedSymbol} onSeedConsumed={handleSeedConsumed} />
          </div>

          <div style={{ display: activePage === 'portfolio' ? undefined : 'none' }} className={pageWrap}>
            <PortfolioPage />
          </div>
        </main>
      </div>

      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default App;
