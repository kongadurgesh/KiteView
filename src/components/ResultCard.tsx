import { useState } from "react";
import { PatternMatch } from "../types";
import { QuantityTable } from "./QuantityTable";

interface ResultCardProps {
  match: PatternMatch;
  stockName: string;
  symbol: string;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  allTimeHigh: number;
  marketCapCr: number;
}

function getCapCategory(mcCr: number): { label: string; color: string } {
  if (mcCr >= 20000) return { label: "Large Cap", color: "text-blue-700 bg-blue-50" };
  if (mcCr >= 5000) return { label: "Mid Cap", color: "text-teal-700 bg-teal-50" };
  return { label: "Small Cap", color: "text-gray-600 bg-gray-100" };
}

function formatMarketCap(mcCr: number): string {
  if (mcCr >= 100000) return `${(mcCr / 100000).toFixed(2)} L Cr`;
  return `${mcCr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ResultCard({
  match,
  stockName,
  symbol,
  currentPrice,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  allTimeHigh,
  marketCapCr,
}: ResultCardProps) {
  const priceDiff = currentPrice - match.buyPrice;
  const priceDiffPct = ((priceDiff / match.buyPrice) * 100).toFixed(2);
  const isAbove = priceDiff >= 0;
  const signal = currentPrice > match.buyPrice ? "WAIT" : "BUY";
  const capCategory = getCapCategory(marketCapCr);
  const [slPct, setSlPct] = useState(10);
  const stopLossPrice = parseFloat((match.buyPrice * (1 - slPct / 100)).toFixed(2));

  return (
    <div className="w-full max-w-5xl mt-10 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{stockName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{symbol}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Indicator label="Pattern">
              <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                {match.patternName}
              </span>
            </Indicator>
            {marketCapCr > 0 && (
              <Indicator label="Market Cap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${capCategory.color}`}>
                  {capCategory.label} &middot; {formatMarketCap(marketCapCr)}
                </span>
              </Indicator>
            )}
            <Indicator label="Signal">
              <span
                className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${
                  signal === "BUY"
                    ? "bg-green-600 text-white"
                    : "bg-amber-400 text-amber-900"
                }`}
              >
                {signal}
              </span>
            </Indicator>
            <Indicator label="Pattern Date">
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                {match.candle3.date}
              </span>
            </Indicator>
          </div>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PriceCard
          label="Buy Trigger Price"
          value={fmt(match.buyTriggerPrice)}
          sub={`0.985 × ${fmt(match.candle3.close)}`}
          accent="amber"
        />
        <PriceCard
          label="Buy Price"
          value={fmt(match.buyPrice)}
          sub={`0.98 × ${fmt(match.candle3.close)}`}
          accent="green"
        />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Current Price
          </p>
          <p className="text-3xl font-bold text-gray-900 font-mono">{fmt(currentPrice)}</p>
          <p className={`text-sm font-semibold mt-2 ${isAbove ? "text-green-600" : "text-red-500"}`}>
            {isAbove ? "+" : ""}
            {priceDiffPct}%
            <span className="font-normal text-gray-400 text-xs ml-1">from buy price</span>
          </p>
        </div>
      </div>

      {/* Stop Loss */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Stop Loss %</p>
          <select
            value={slPct}
            onChange={(e) => setSlPct(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent cursor-pointer"
          >
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </select>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">Stop Loss Price</p>
          <p className="text-2xl font-bold text-red-600 font-mono">{fmt(stopLossPrice)}</p>
          <p className="text-xs text-red-400 mt-0.5">
            {(1 - slPct / 100).toFixed(3)} &times; {fmt(match.buyPrice)} (Buy Price)
          </p>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatChip
          label="52W High"
          value={fmt(fiftyTwoWeekHigh)}
          note={currentPrice > 0 && fiftyTwoWeekHigh > 0
            ? `${((1 - currentPrice / fiftyTwoWeekHigh) * 100).toFixed(1)}% below`
            : undefined}
        />
        <StatChip
          label="52W Low"
          value={fmt(fiftyTwoWeekLow)}
          note={currentPrice > 0 && fiftyTwoWeekLow > 0
            ? `${(((currentPrice / fiftyTwoWeekLow) - 1) * 100).toFixed(1)}% above`
            : undefined}
        />
        <StatChip
          label="All-Time High"
          value={fmt(allTimeHigh)}
          note={currentPrice > 0 && allTimeHigh > 0
            ? `${((1 - currentPrice / allTimeHigh) * 100).toFixed(1)}% below`
            : undefined}
        />
      </div>

      {/* Quantity Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <QuantityTable buyPrice={match.buyPrice} />
      </div>
    </div>
  );
}

function PriceCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: "amber" | "green";
}) {
  const colors = accent === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-green-200 bg-green-50 text-green-900";
  const subColor = accent === "amber" ? "text-amber-600" : "text-green-600";

  return (
    <div className={`rounded-2xl border shadow-sm p-5 text-center ${colors}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">{label}</p>
      <p className="text-3xl font-bold font-mono">{value}</p>
      <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>
    </div>
  );
}

function StatChip({ label, value, note }: {
  label: string; value: string; note?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800 font-mono">{value}</p>
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

function Indicator({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </div>
  );
}
