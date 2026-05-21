export interface AnalysisProfile {
  sector: string;
  industry: string;
  longBusinessSummary: string;
  website: string;
  fullTimeEmployees: number | null;
}

export interface AnalysisNewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string | null;
}

export interface AnalysisRecommendations {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface FinancialHighlights {
  revenueGrowth: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  returnOnEquity: number | null;
  debtToEquity: number | null;
}

export type QuarterlyReportBasis = 'consolidated' | 'standalone' | 'unknown';

export interface QuarterlyPeriod {
  endDate: string;
  label: string;
  revenue: number | null;
  pretaxIncome: number | null;
  netIncomeCommon: number | null;
  basicEps: number | null;
}

export interface QuarterlyResults {
  basis: QuarterlyReportBasis;
  periods: QuarterlyPeriod[];
}
