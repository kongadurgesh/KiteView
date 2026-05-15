import { useState, useCallback } from 'react';
import { PatternMatch } from '../../types';
import { fetchLookupBundle } from '../../services/apiBatch';
import { detectPattern } from '../../utils/patternDetector';
import type { Candle, StockInfo } from '../../types';

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

export function useLookup() {
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

  const search = useCallback(async (sym: string) => {
    setIsLoading(true);
    setError(null);
    setMatch(null);
    setNoMatch(false);
    setSymbol(sym);

    try {
      const bundle = await fetchLookupBundle(sym);
      const stockInfo = parseStockInfo(bundle.chart1y, sym);
      const ath = parseAth(bundle.chartMax);
      const r = (bundle.quote as { quoteResponse?: { result?: Array<{ marketCap?: number; sector?: string; industry?: string }> } })
        ?.quoteResponse?.result?.[0];
      const meta = {
        marketCapCr: r?.marketCap ? r.marketCap / 1e7 : 0,
        sector: bundle.profile.sector || r?.sector || '',
        industry: bundle.profile.industry || r?.industry || '',
      };

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
      if (result) setMatch(result);
      else setNoMatch(true);

      setLastLookup({ symbol: sym, name: stockInfo.shortName, price: stockInfo.currentPrice });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
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
    lastLookup,
    search,
    canRescan: Boolean(symbol) && !isLoading,
  };
}
