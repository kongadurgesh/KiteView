export type IndexCategory = 'indian' | 'global' | 'forex' | 'commodity' | 'crypto';

export interface IndexInstrument {
  id: string;
  label: string;
  symbol: string;
  category: IndexCategory;
  /** ISO 3166-1 alpha-2 — shown on Indices page for global benchmarks */
  flagCode?: string;
}

export const INDEX_CATEGORIES: { id: IndexCategory; title: string }[] = [
  { id: 'indian', title: 'Indian' },
  { id: 'global', title: 'Global' },
  { id: 'forex', title: 'Forex' },
  { id: 'commodity', title: 'Commodity' },
  { id: 'crypto', title: 'Crypto' },
];

export const ALL_INDICES: IndexInstrument[] = [
  // Indian
  { id: 'nifty50', label: 'Nifty 50', symbol: '^NSEI', category: 'indian' },
  { id: 'sensex', label: 'Sensex', symbol: '^BSESN', category: 'indian' },
  { id: 'banknifty', label: 'Bank Nifty', symbol: '^NSEBANK', category: 'indian' },
  { id: 'niftyit', label: 'Nifty IT', symbol: '^CNXIT', category: 'indian' },
  { id: 'nifty200', label: 'Nifty 200', symbol: '^CNX200', category: 'indian' },
  { id: 'midcap50', label: 'Nifty Midcap 50', symbol: '^NSEMDCP50', category: 'indian' },
  { id: 'smallcap', label: 'Nifty Smallcap 100', symbol: '^CNXSC', category: 'indian' },
  { id: 'niftyauto', label: 'Nifty Auto', symbol: '^CNXAUTO', category: 'indian' },
  { id: 'niftyfmcg', label: 'Nifty FMCG', symbol: '^CNXFMCG', category: 'indian' },
  { id: 'niftymetal', label: 'Nifty Metal', symbol: '^CNXMETAL', category: 'indian' },
  { id: 'niftyenergy', label: 'Nifty Energy', symbol: '^CNXENERGY', category: 'indian' },
  { id: 'niftyrealty', label: 'Nifty Realty', symbol: '^CNXREALTY', category: 'indian' },
  { id: 'niftypharma', label: 'Nifty Pharma', symbol: '^CNXPHARMA', category: 'indian' },
  { id: 'niftypsu', label: 'Nifty PSU Bank', symbol: '^CNXPSUBANK', category: 'indian' },
  // Global
  { id: 'sp500', label: 'S&P 500', symbol: '^GSPC', category: 'global', flagCode: 'us' },
  { id: 'dow', label: 'Dow Jones', symbol: '^DJI', category: 'global', flagCode: 'us' },
  { id: 'nasdaq', label: 'Nasdaq', symbol: '^IXIC', category: 'global', flagCode: 'us' },
  { id: 'russell', label: 'Russell 2000', symbol: '^RUT', category: 'global', flagCode: 'us' },
  { id: 'ftse', label: 'FTSE 100', symbol: '^FTSE', category: 'global', flagCode: 'gb' },
  { id: 'dax', label: 'DAX', symbol: '^GDAXI', category: 'global', flagCode: 'de' },
  { id: 'cac', label: 'CAC 40', symbol: '^FCHI', category: 'global', flagCode: 'fr' },
  { id: 'nikkei', label: 'Nikkei 225', symbol: '^N225', category: 'global', flagCode: 'jp' },
  { id: 'hangseng', label: 'Hang Seng', symbol: '^HSI', category: 'global', flagCode: 'hk' },
  { id: 'kospi', label: 'KOSPI', symbol: '^KS11', category: 'global', flagCode: 'kr' },
  { id: 'asx', label: 'ASX 200', symbol: '^AXJO', category: 'global', flagCode: 'au' },
  // Forex
  { id: 'usdinr', label: 'USD/INR', symbol: 'INR=X', category: 'forex' },
  { id: 'eurusd', label: 'EUR/USD', symbol: 'EURUSD=X', category: 'forex' },
  { id: 'gbpusd', label: 'GBP/USD', symbol: 'GBPUSD=X', category: 'forex' },
  { id: 'usdjpy', label: 'USD/JPY', symbol: 'USDJPY=X', category: 'forex' },
  // Commodity
  { id: 'gold', label: 'Gold', symbol: 'GC=F', category: 'commodity' },
  { id: 'silver', label: 'Silver', symbol: 'SI=F', category: 'commodity' },
  { id: 'crude', label: 'Crude Oil', symbol: 'CL=F', category: 'commodity' },
  { id: 'natgas', label: 'Natural Gas', symbol: 'NG=F', category: 'commodity' },
  // Crypto
  { id: 'btc', label: 'Bitcoin', symbol: 'BTC-USD', category: 'crypto' },
  { id: 'eth', label: 'Ethereum', symbol: 'ETH-USD', category: 'crypto' },
];

/** Top-bar ticker strip (subset of catalog). */
export const TICKER_INDICES: IndexInstrument[] = [
  { id: 'nifty50', label: 'Nifty 50', symbol: '^NSEI', category: 'indian' },
  { id: 'sensex', label: 'Sensex', symbol: '^BSESN', category: 'indian' },
  { id: 'banknifty', label: 'Bank Nifty', symbol: '^NSEBANK', category: 'indian' },
  { id: 'niftyit', label: 'Nifty IT', symbol: '^CNXIT', category: 'indian' },
  { id: 'nifty200', label: 'Nifty 200', symbol: '^CNX200', category: 'indian' },
  { id: 'sp500', label: 'S&P 500', symbol: '^GSPC', category: 'global' },
  { id: 'gold', label: 'Gold', symbol: 'GC=F', category: 'commodity' },
  { id: 'silver', label: 'Silver', symbol: 'SI=F', category: 'commodity' },
  { id: 'usdinr', label: 'USD/INR', symbol: 'INR=X', category: 'forex' },
];

export function indicesByCategory(category: IndexCategory): IndexInstrument[] {
  return ALL_INDICES.filter((i) => i.category === category);
}

/** Decimal places for display by category. */
export function indexPriceDecimals(category: IndexCategory): { min: number; max: number } {
  switch (category) {
    case 'forex':
      return { min: 2, max: 4 };
    case 'crypto':
      return { min: 0, max: 2 };
    case 'commodity':
      return { min: 2, max: 2 };
    default:
      return { min: 2, max: 2 };
  }
}
