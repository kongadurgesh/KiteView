/**
 * Authoritative index constituent sources — used by refresh script and live API fallback.
 * Keep index ids aligned with backend/heatmapIndexConfig.js
 *
 * Sources:
 * - niftyindices: official NSE index CSVs (https://www.niftyindices.com)
 * - csv: public constituent lists (e.g. GitHub datasets mirror of S&P 500)
 * - wikipedia-table: Wikipedia constituent tables (Dow, Nasdaq 100, FTSE, DAX, CAC, Nikkei, …)
 */

/** @typedef {{ kind: string, label: string, group: 'indian' | 'global', csvSlug?: string, wikiPage?: string, csvUrl?: string, yahooMarket?: string, minRows?: number, maxRows?: number }} RefreshSpec */

/** @type {Record<string, RefreshSpec>} */
export const BUNDLED_REFRESH_SPECS = {
  nifty50: { kind: 'niftyindices', csvSlug: 'nifty50', label: 'Nifty 50', group: 'indian' },
  niftynext50: { kind: 'niftyindices', csvSlug: 'niftynext50', label: 'Nifty Next 50', group: 'indian' },
  nifty100: { kind: 'niftyindices', csvSlug: 'nifty100', label: 'Nifty 100', group: 'indian' },
  nifty200: { kind: 'niftyindices', csvSlug: 'nifty200', label: 'Nifty 200', group: 'indian' },
  midcap50: { kind: 'niftyindices', csvSlug: 'niftymidcap50', label: 'Nifty Midcap 50', group: 'indian' },
  niftymidcap100: { kind: 'niftyindices', csvSlug: 'niftymidcap100', label: 'Nifty Midcap 100', group: 'indian' },
  nifty500: { kind: 'niftyindices', csvSlug: 'nifty500', label: 'Nifty 500', group: 'indian' },
  smallcap: { kind: 'niftyindices', csvSlug: 'niftysmallcap100', label: 'Nifty Smallcap 100', group: 'indian' },
  niftysmallcap100: { kind: 'niftyindices', csvSlug: 'niftysmallcap100', label: 'Nifty Smallcap 100', group: 'indian' },
  banknifty: { kind: 'niftyindices', csvSlug: 'niftybank', label: 'Bank Nifty', group: 'indian' },
  niftyit: { kind: 'niftyindices', csvSlug: 'niftyit', label: 'Nifty IT', group: 'indian' },
  niftyauto: { kind: 'niftyindices', csvSlug: 'niftyauto', label: 'Nifty Auto', group: 'indian' },
  niftyfmcg: { kind: 'niftyindices', csvSlug: 'niftyfmcg', label: 'Nifty FMCG', group: 'indian' },
  niftymetal: { kind: 'niftyindices', csvSlug: 'niftymetal', label: 'Nifty Metal', group: 'indian' },
  niftyenergy: { kind: 'niftyindices', csvSlug: 'niftyenergy', label: 'Nifty Energy', group: 'indian' },
  niftyrealty: { kind: 'niftyindices', csvSlug: 'niftyrealty', label: 'Nifty Realty', group: 'indian' },
  niftypharma: { kind: 'niftyindices', csvSlug: 'niftypharma', label: 'Nifty Pharma', group: 'indian' },
  niftypsu: { kind: 'niftyindices', csvSlug: 'niftypsubank', label: 'Nifty PSU Bank', group: 'indian' },
  sensex: {
    kind: 'wikipedia-table',
    wikiPage: 'BSE_SENSEX',
    wikiSection: 3,
    label: 'Sensex 30',
    group: 'indian',
    yahooMarket: 'nse',
    minRows: 25,
    maxRows: 35,
  },
  sp500: {
    kind: 'csv',
    csvUrl: 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv',
    label: 'S&P 500',
    group: 'global',
    yahooMarket: 'us',
  },
  nasdaq: {
    kind: 'wikipedia-table',
    wikiPage: 'Nasdaq-100',
    label: 'Nasdaq 100',
    group: 'global',
    yahooMarket: 'us',
    minRows: 90,
    maxRows: 110,
  },
  dow: {
    kind: 'wikipedia-table',
    wikiPage: 'Dow_Jones_Industrial_Average',
    label: 'Dow Jones',
    group: 'global',
    yahooMarket: 'us',
    minRows: 28,
    maxRows: 35,
  },
  ftse: {
    kind: 'wikipedia-table',
    wikiPage: 'FTSE_100_Index',
    label: 'FTSE 100',
    group: 'global',
    yahooMarket: 'uk',
    minRows: 90,
    maxRows: 110,
  },
  dax: {
    kind: 'wikipedia-table',
    wikiPage: 'DAX',
    label: 'DAX',
    group: 'global',
    yahooMarket: 'de',
    minRows: 35,
    maxRows: 45,
  },
  cac: {
    kind: 'wikipedia-table',
    wikiPage: 'CAC_40',
    label: 'CAC 40',
    group: 'global',
    yahooMarket: 'fr',
    minRows: 35,
    maxRows: 45,
  },
  asx: {
    kind: 'wikipedia-table',
    wikiPage: 'S&P/ASX_200',
    label: 'ASX 200',
    group: 'global',
    yahooMarket: 'au',
    minRows: 150,
    maxRows: 220,
  },
};

/** Indices without a free authoritative list — regional cap-ranked proxy only. */
export const PROXY_INDEX_IDS = new Set(['russell', 'kospi', 'nikkei', 'hangseng']);

export function getRefreshSpec(indexId) {
  return BUNDLED_REFRESH_SPECS[indexId] ?? null;
}

export function isProxyIndexId(indexId) {
  return PROXY_INDEX_IDS.has(indexId);
}
