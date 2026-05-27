import { useState, useCallback, useMemo } from 'react';
import { PatternMatch, Candle } from '../../types';
import type { StockStats } from '../../types/stockStats';
import type {
  AnalysisProfile,
  AnalysisNewsItem,
  AnalysisRecommendations,
  FinancialHighlights,
  QuarterlyPeriod,
  QuarterlyResults,
  QuarterlyResultsRaw,
} from '../../types/analysisExtras';
import { fetchAnalysisBundle, fetchStatsBatch } from '../../services/apiBatch';
import { detectPattern } from '../../utils/patternDetector';
import type { StockInfo } from '../../types';
import { isIndianSymbol } from '../../lib/nseSymbol';
import { resolveYahooSymbol } from '../../services/yahooSymbol';
import { parseQuoteSnapshot, type QuoteSnapshot } from './quoteSnapshot';
import { getPatternChartWindow, type PatternChartBar } from './patternChartCandles';
import { buildTechnicalSummary, candlesToChartSeries } from './technicalUtils';
import { buildDvmScores } from './analysisScores';

/** Map legacy API keys to current QuarterlyPeriod fields. */
function normalizeQuarterlyPeriod(p: QuarterlyPeriod & {
  profitBeforeTax?: number | null;
  incomeBeforeTax?: number | null;
  operatingProfit?: number | null;
  netProfit?: number | null;
  netIncome?: number | null;
  netIncomeCommonStockholders?: number | null;
  netIncomeApplicableToCommonShares?: number | null;
  basicEPS?: number | null;
}): QuarterlyPeriod {
  return {
    endDate: p.endDate,
    label: p.label,
    revenue: p.revenue ?? null,
    pretaxIncome: p.pretaxIncome ?? p.profitBeforeTax ?? p.incomeBeforeTax ?? null,
    netIncomeCommon:
      p.netIncomeCommon
      ?? p.netIncomeCommonStockholders
      ?? p.netIncomeApplicableToCommonShares
      ?? p.netProfit
      ?? p.netIncome
      ?? null,
    basicEps: p.basicEps ?? p.basicEPS ?? null,
  };
}

function normalizeQuarterlyResults(qr: QuarterlyResults): QuarterlyResults {
  return {
    basis: qr.basis,
    periods: qr.periods
      .map((p) => normalizeQuarterlyPeriod(p))
      .sort((a, b) => b.endDate.localeCompare(a.endDate)),
  };
}

function normalizeQuarterlyResultsRaw(qr?: QuarterlyResultsRaw): QuarterlyResultsRaw {
  const fallback: QuarterlyResultsRaw = {
    basis: 'unknown',
    consolidated: { source: 'fundamentals-timeseries', periods: [] },
    standalone: { source: 'incomeStatementHistoryQuarterly', periods: [] },
  };
  if (!qr) return fallback;
  const sortByDate = <T extends { endDate: string }>(periods: T[]): T[] => (
    [...periods].sort((a, b) => b.endDate.localeCompare(a.endDate)).slice(0, 5)
  );
  return {
    basis: qr.basis ?? 'unknown',
    consolidated: {
      source: qr.consolidated?.source ?? fallback.consolidated.source,
      periods: sortByDate(qr.consolidated?.periods ?? []),
    },
    standalone: {
      source: qr.standalone?.source ?? fallback.standalone.source,
      periods: sortByDate(qr.standalone?.periods ?? []),
    },
  };
}

function parseStockInfo(chartData: unknown, symbol: string): StockInfo {
  const result = (chartData as { chart?: { result?: unknown[] } })?.chart?.result?.[0] as {
    timestamp?: number[];
    indicators?: { quote?: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
    meta?: {
      shortName?: string;
      symbol?: string;
      regularMarketPrice?: number;
      sharesOutstanding?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
    };
  } | undefined;

  if (!result) throw new Error('No data returned for this symbol. Check the ticker and try again.');

  const timestamps: number[] = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) throw new Error('No quote data available.');

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    if (v === 0) continue;
    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: parseFloat(o.toFixed(2)),
      high: parseFloat(h.toFixed(2)),
      low: parseFloat(l.toFixed(2)),
      close: parseFloat(c.toFixed(2)),
      volume: v,
    });
  }

  const meta = result.meta ?? {};
  const regularMarketPrice = meta.regularMarketPrice ?? 0;
  const sharesOutstanding = meta.sharesOutstanding;
  let marketCapCr = 0;
  if (sharesOutstanding && regularMarketPrice) {
    marketCapCr = (regularMarketPrice * sharesOutstanding) / 1e7;
  }

  return {
    symbol,
    shortName: meta.shortName ?? meta.symbol ?? symbol,
    marketCap: marketCapCr,
    currentPrice: regularMarketPrice,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    candles,
  };
}

function parseAth(chartData: unknown): number {
  const highs: (number | null)[] =
    (chartData as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ high?: (number | null)[] }> } }> } })
      ?.chart?.result?.[0]?.indicators?.quote?.[0]?.high ?? [];
  let ath = 0;
  for (const h of highs) {
    if (h != null && h > ath) ath = h;
  }
  return parseFloat(ath.toFixed(2));
}

const emptyProfile: AnalysisProfile = {
  sector: '',
  industry: '',
  longBusinessSummary: '',
  website: '',
  fullTimeEmployees: null,
};

const emptyFinancials: FinancialHighlights = {
  revenueGrowth: null,
  profitMargins: null,
  operatingMargins: null,
  returnOnEquity: null,
  debtToEquity: null,
};

const emptyRecs: AnalysisRecommendations = {
  strongBuy: 0,
  buy: 0,
  hold: 0,
  sell: 0,
  strongSell: 0,
};

const emptyQuarterly: QuarterlyResults = { basis: 'unknown', periods: [] };
const emptyQuarterlyRaw: QuarterlyResultsRaw = {
  basis: 'unknown',
  consolidated: { source: 'fundamentals-timeseries', periods: [] },
  standalone: { source: 'incomeStatementHistoryQuarterly', periods: [] },
};

export function useStockAnalysis() {
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
  const [quoteSnapshot, setQuoteSnapshot] = useState<QuoteSnapshot | null>(null);
  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  const [patternChartBars, setPatternChartBars] = useState<PatternChartBar[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [profile, setProfile] = useState<AnalysisProfile>(emptyProfile);
  const [financials, setFinancials] = useState<FinancialHighlights>(emptyFinancials);
  const [recommendations, setRecommendations] = useState<AnalysisRecommendations>(emptyRecs);
  const [news, setNews] = useState<AnalysisNewsItem[]>([]);
  const [quarterlyResults, setQuarterlyResults] = useState<QuarterlyResults>(emptyQuarterly);
  const [quarterlyResultsRaw, setQuarterlyResultsRaw] = useState<QuarterlyResultsRaw>(emptyQuarterlyRaw);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (sym: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    setMatch(null);
    setNoMatch(false);
    setQuoteSnapshot(null);
    setStockStats(null);
    setPatternChartBars([]);
    setCandles([]);
    setProfile(emptyProfile);
    setFinancials(emptyFinancials);
    setRecommendations(emptyRecs);
    setNews([]);
    setQuarterlyResults(emptyQuarterly);
    setQuarterlyResultsRaw(emptyQuarterlyRaw);
    setStockName('');
    setCurrentPrice(0);
    setHasSearched(true);
    setSymbol('');

    let norm: string;
    try {
      const resolved = await resolveYahooSymbol(sym);
      if (!resolved) {
        setError('Symbol not found. Try the company name or full ticker (e.g. AAPL, TCS.NS).');
        return null;
      }
      norm = resolved;
      setSymbol(norm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve symbol');
      return null;
    }

    try {
      const [bundle, statsMap] = await Promise.all([
        fetchAnalysisBundle(norm),
        fetchStatsBatch<StockStats>([norm]),
      ]);
      const statsKey =
        statsMap[norm] != null
          ? norm
          : Object.keys(statsMap).find((k) => k.toUpperCase() === norm.toUpperCase()) ?? norm;

      const stockInfo = parseStockInfo(bundle.chart1y, norm);
      const ath = parseAth(bundle.chartMax);
      const r = (bundle.quote as { quoteResponse?: { result?: Array<{ marketCap?: number; sector?: string; industry?: string }> } })
        ?.quoteResponse?.result?.[0];

      setCandles(stockInfo.candles);
      setStockName(stockInfo.shortName);
      setCurrentPrice(stockInfo.currentPrice);
      setFiftyTwoWeekHigh(stockInfo.fiftyTwoWeekHigh);
      setFiftyTwoWeekLow(stockInfo.fiftyTwoWeekLow);
      setAllTimeHigh(ath);

      const prof = bundle.profile ?? emptyProfile;
      setProfile(prof);
      setSector(prof.sector || r?.sector || '');
      setIndustry(prof.industry || '');

      setFinancials(bundle.financials ?? emptyFinancials);
      setRecommendations(bundle.recommendations ?? emptyRecs);
      setNews(bundle.news ?? []);
      setQuarterlyResults(
        normalizeQuarterlyResults(bundle.quarterlyResults ?? emptyQuarterly),
      );
      setQuarterlyResultsRaw(normalizeQuarterlyResultsRaw(bundle.quarterlyResultsRaw));

      const statsMc = statsMap[statsKey]?.marketCap;
      const indian = isIndianSymbol(norm);
      const mcCr = indian
        ? stockInfo.marketCap > 0
          ? stockInfo.marketCap
          : r?.marketCap
            ? r.marketCap / 1e7
            : statsMc
              ? statsMc / 1e7
              : 0
        : 0;
      setMarketCapCr(mcCr);

      setQuoteSnapshot(parseQuoteSnapshot(bundle.quote));
      setStockStats(statsMap[statsKey] ?? null);

      const result = detectPattern(stockInfo.candles, mcCr);
      if (result) {
        setMatch(result);
        setPatternChartBars(getPatternChartWindow(stockInfo.candles, result));
        setNoMatch(false);
      } else {
        setNoMatch(true);
        setPatternChartBars([]);
      }
      return norm;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const technical = useMemo(
    () => buildTechnicalSummary(candles, currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow),
    [candles, currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow],
  );

  const priceSeries = useMemo(() => candlesToChartSeries(candles), [candles]);

  const dvm = useMemo(
    () => buildDvmScores(stockStats, currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, technical),
    [stockStats, currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, technical],
  );

  return {
    isLoading,
    error,
    hasSearched,
    match,
    stockName,
    symbol,
    currentPrice,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    allTimeHigh,
    marketCapCr,
    sector,
    industry,
    noMatch,
    quoteSnapshot,
    stockStats,
    patternChartBars,
    candles,
    profile,
    financials,
    recommendations,
    news,
    technical,
    priceSeries,
    quarterlyResults,
    quarterlyResultsRaw,
    dvm,
    search,
    canRescan: Boolean(symbol) && !isLoading,
  };
}

/** @deprecated Use useStockAnalysis */
export const useLookup = useStockAnalysis;
