import { PatternMatch } from "../types";
import { CandleDetails } from "./CandleDetails";
import { QuantityTable } from "./QuantityTable";

interface ResultCardProps {
  match: PatternMatch;
  stockName: string;
  symbol: string;
  currentPrice: number;
}

export function ResultCard({
  match,
  stockName,
  symbol,
  currentPrice,
}: ResultCardProps) {
  const priceDiff = currentPrice - match.buyPrice;
  const priceDiffPct = ((priceDiff / match.buyPrice) * 100).toFixed(2);
  const isAbove = priceDiff >= 0;
  const signal = currentPrice > match.buyPrice ? 'WAIT' : 'BUY';

  return (
    <div className="w-full max-w-4xl mt-8">
      <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            {stockName}{" "}
            <span className="text-gray-400 text-sm">({symbol})</span>
          </h2>
          <div className="flex justify-center items-center gap-3 mb-1">
            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold uppercase px-2 py-0.5 rounded">
              {match.patternName}
            </span>
            <span
              className={`inline-block text-sm font-bold uppercase px-3 py-1 rounded-lg ${
                signal === 'BUY'
                  ? 'bg-green-600 text-white'
                  : 'bg-yellow-400 text-yellow-900'
              }`}
            >
              {signal}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Pattern found on {match.candle3.date}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-8 py-4">
              <p className="text-sm font-medium text-amber-700 uppercase tracking-wide mb-1">
                Buy Trigger Price
              </p>
              <p className="text-4xl font-bold text-amber-800 font-mono">
                {match.buyTriggerPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                0.985 &times;{" "}
                {match.candle3.close.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}{" "}
                (Breakout Close)
              </p>
            </div>
            <div className="bg-green-100 border border-green-300 rounded-xl px-8 py-4">
              <p className="text-sm font-medium text-green-700 uppercase tracking-wide mb-1">
                Buy Price
              </p>
              <p className="text-4xl font-bold text-green-800 font-mono">
                {match.buyPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-green-600 mt-1">
                0.98 &times;{" "}
                {match.candle3.close.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}{" "}
                (Breakout Close)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-8 py-4">
              <p className="text-sm font-medium text-blue-700 uppercase tracking-wide mb-1">
                Current Price
              </p>
              <p className="text-4xl font-bold text-blue-800 font-mono">
                {currentPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p
                className={`text-sm font-semibold mt-1 ${isAbove ? "text-green-600" : "text-red-600"}`}
              >
                {isAbove ? "+" : ""}
                {priceDiffPct}%
                <span className="font-normal text-xs ml-1">from buy price</span>
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Pattern Candles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CandleDetails
            candle={match.candle1}
            label="Red (Bearish)"
            labelColor="bg-red-100 text-red-700"
          />
          <CandleDetails
            candle={match.candle2}
            label={
              match.patternName === "Bullish Harami"
                ? "Harami (Inside)"
                : "Engulfing"
            }
            labelColor="bg-amber-100 text-amber-700"
          />
          <CandleDetails
            candle={match.candle3}
            label="Breakout"
            labelColor="bg-green-100 text-green-700"
          />
        </div>

        <QuantityTable buyPrice={match.buyPrice} />
      </div>
    </div>
  );
}
