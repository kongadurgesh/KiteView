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

export interface QuarterlyRawValue {
  raw?: number | null;
  fmt?: string;
  [key: string]: unknown;
}

export type QuarterlyRawMetric = QuarterlyRawValue | number | null;

export interface QuarterlyConsolidatedRawPeriod {
  endDate: string;
  label: string;
  quarterlyTotalRevenue?: QuarterlyRawMetric;
  quarterlyPretaxIncome?: QuarterlyRawMetric;
  quarterlyNetIncomeCommonStockholders?: QuarterlyRawMetric;
  quarterlyBasicEPS?: QuarterlyRawMetric;
  [key: string]: unknown;
}

export interface QuarterlyStandaloneRawPeriod {
  endDate: string;
  label: string;
  totalRevenue?: QuarterlyRawMetric;
  pretaxIncome?: QuarterlyRawMetric;
  incomeBeforeTax?: QuarterlyRawMetric;
  netIncomeCommonStockholders?: QuarterlyRawMetric;
  netIncomeApplicableToCommonShares?: QuarterlyRawMetric;
  netIncome?: QuarterlyRawMetric;
  basicEPS?: QuarterlyRawMetric;
  basicEps?: QuarterlyRawMetric;
  [key: string]: unknown;
}

interface QuarterlyRawBasis<TPeriod> {
  source: string;
  periods: TPeriod[];
}

export interface QuarterlyResultsRaw {
  basis: QuarterlyReportBasis;
  consolidated: QuarterlyRawBasis<QuarterlyConsolidatedRawPeriod>;
  standalone: QuarterlyRawBasis<QuarterlyStandaloneRawPeriod>;
}
