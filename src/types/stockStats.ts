/** Key stats from `/api/stats-batch` / quoteSummary (same shape as Compare page). */
export interface StockStats {
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  beta: number | null;
  fiftyTwoWeekChange: number | null;
  marketCap: number | null;
  shortName: string;
  regularMarketPrice: number | null;
  sector: string;
}
