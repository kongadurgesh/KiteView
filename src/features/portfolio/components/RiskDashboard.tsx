import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Portfolio } from '../../../types';
import { getPositions } from '../../../utils/portfolio';
import { fetchHistoricalPrices } from '../../../utils/portfolioChart';
import { fetchStockMeta } from '../../../utils/fetchStockData';
import {
  dailyReturns,
  computeBeta,
  computeMaxDrawdown,
  computeVolatility,
  computeSharpeRatio,
  diversificationScore,
  computeSectorConcentration,
  SectorWeight,
} from '../../../utils/riskMetrics';
import {
  CAP_CATEGORY_ORDER,
  CapCategory,
  capCategoryColor,
  getCapCategory,
} from '../../../lib/marketCap';

const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#84cc16', '#64748b'];

interface Props {
  portfolio: Portfolio;
  livePrices: Record<string, number>;
  embedded?: boolean;
}

interface StockAllocation {
  name: string;
  symbol: string;
  weight: number;
  value: number;
}

interface SectorStockDetail {
  name: string;
  symbol: string;
  weight: number;
  value: number;
}

interface CapWeight {
  category: CapCategory;
  weight: number;
}

interface CapStockDetail {
  name: string;
  symbol: string;
  weight: number;
  value: number;
  marketCapCr: number;
}

export function RiskDashboard({ portfolio, livePrices, embedded }: Props) {
  const [loading, setLoading] = useState(true);
  const [sectorData, setSectorData] = useState<SectorWeight[]>([]);
  const [beta, setBeta] = useState(0);
  const [volatility, setVolatility] = useState(0);
  const [sharpe, setSharpe] = useState(0);
  const [maxDd, setMaxDd] = useState(0);
  const [divScore, setDivScore] = useState(0);
  const [stockAllocation, setStockAllocation] = useState<StockAllocation[]>([]);
  const [sectorStocks, setSectorStocks] = useState<Record<string, SectorStockDetail[]>>({});
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [capData, setCapData] = useState<CapWeight[]>([]);
  const [capStocks, setCapStocks] = useState<Partial<Record<CapCategory, CapStockDetail[]>>>({});
  const [selectedCap, setSelectedCap] = useState<CapCategory | null>(null);

  const positions = getPositions(portfolio);
  const activePositions = positions.filter((p) => p.totalQty > 0);

  useEffect(() => {
    if (activePositions.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function compute() {
      setLoading(true);
      try {
        const symbols = activePositions.map((p) => p.symbol);
        const allSymbols = [...symbols, '^NSEI'];

        const [prices, ...metaResults] = await Promise.all([
          fetchHistoricalPrices(allSymbols, '1y'),
          ...symbols.map((s) => fetchStockMeta(s)),
        ]);

        if (cancelled) return;

        const sectorMap: Record<string, string> = {};
        const marketCapMap: Record<string, number> = {};
        symbols.forEach((s, i) => {
          sectorMap[s] = metaResults[i].sector || 'Unknown';
          marketCapMap[s] = metaResults[i].marketCapCr ?? 0;
        });

        // Holdings with current value
        const holdings = activePositions.map((p) => ({
          symbol: p.symbol,
          value: (livePrices[p.symbol] ?? p.avgBuyPrice) * p.totalQty,
        }));
        const totalValue = holdings.reduce((s, h) => s + h.value, 0);

        // Sector concentration
        const sectors = computeSectorConcentration(holdings, sectorMap);
        setSectorData(sectors);

        // Sector → stocks breakdown
        const bySector: Record<string, SectorStockDetail[]> = {};
        for (const h of holdings) {
          const sec = sectorMap[h.symbol] || 'Unknown';
          const pos = activePositions.find((p) => p.symbol === h.symbol)!;
          if (!bySector[sec]) bySector[sec] = [];
          bySector[sec].push({
            name: pos.stockName,
            symbol: h.symbol,
            weight: totalValue > 0 ? h.value / totalValue : 0,
            value: h.value,
          });
        }
        for (const key of Object.keys(bySector)) {
          bySector[key].sort((a, b) => b.weight - a.weight);
        }
        setSectorStocks(bySector);

        // Market cap allocation
        const byCap: Partial<Record<CapCategory, CapStockDetail[]>> = {};
        const capTotals: Partial<Record<CapCategory, number>> = {};
        for (const h of holdings) {
          const cat = getCapCategory(marketCapMap[h.symbol] ?? 0);
          const pos = activePositions.find((p) => p.symbol === h.symbol)!;
          if (!byCap[cat]) byCap[cat] = [];
          byCap[cat].push({
            name: pos.stockName,
            symbol: h.symbol,
            weight: totalValue > 0 ? h.value / totalValue : 0,
            value: h.value,
            marketCapCr: marketCapMap[h.symbol] ?? 0,
          });
          capTotals[cat] = (capTotals[cat] ?? 0) + h.value;
        }
        for (const cat of CAP_CATEGORY_ORDER) {
          byCap[cat]?.sort((a, b) => b.weight - a.weight);
        }
        const capWeights: CapWeight[] = CAP_CATEGORY_ORDER.filter(
          (cat) => (capTotals[cat] ?? 0) > 0,
        ).map((cat) => ({
          category: cat,
          weight: totalValue > 0 ? (capTotals[cat] ?? 0) / totalValue : 0,
        }));
        setCapData(capWeights);
        setCapStocks(byCap);

        // Diversification
        const weights = holdings.map((h) => h.value / totalValue);
        setDivScore(diversificationScore(weights));

        // Collect all dates from price data
        const allDates = new Set<string>();
        for (const sym of allSymbols) {
          if (prices[sym]) {
            for (const d of Object.keys(prices[sym])) allDates.add(d);
          }
        }
        const sortedDates = Array.from(allDates).sort();

        // Portfolio daily values
        const portfolioValues: number[] = [];
        for (const date of sortedDates) {
          let val = 0;
          let hasAny = false;
          for (const h of holdings) {
            const p = prices[h.symbol]?.[date];
            if (p != null) {
              const qty = activePositions.find((pos) => pos.symbol === h.symbol)!.totalQty;
              val += qty * p;
              hasAny = true;
            }
          }
          if (hasAny) portfolioValues.push(val);
        }

        const portReturns = dailyReturns(portfolioValues);

        // Nifty returns
        const niftyPrices = sortedDates
          .map((d) => prices['^NSEI']?.[d])
          .filter((p): p is number => p != null);
        const niftyReturns = dailyReturns(niftyPrices);

        // Metrics
        const minLen = Math.min(portReturns.length, niftyReturns.length);
        setBeta(computeBeta(portReturns.slice(-minLen), niftyReturns.slice(-minLen)));
        setVolatility(computeVolatility(portReturns));
        setSharpe(computeSharpeRatio(portReturns));

        const dd = computeMaxDrawdown(portfolioValues);
        setMaxDd(dd.maxDrawdown);

        // Stock-wise allocation
        const stockAlloc: StockAllocation[] = holdings
          .map((h) => {
            const pos = activePositions.find((p) => p.symbol === h.symbol)!;
            return {
              name: pos.stockName,
              symbol: h.symbol,
              weight: totalValue > 0 ? h.value / totalValue : 0,
              value: h.value,
            };
          })
          .sort((a, b) => b.weight - a.weight);
        setStockAllocation(stockAlloc);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    compute();
    return () => { cancelled = true; };
  }, [activePositions.map((p) => p.symbol).join(','), JSON.stringify(livePrices)]);

  if (activePositions.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${embedded ? 'py-12' : 'bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-8'}`}>
        <div className="size-8 border-4 border-blue-800/50 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const shell = embedded
    ? 'space-y-6'
    : 'bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-6 space-y-6';

  return (
    <div className={shell}>
      {!embedded && (
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Risk Analytics
        </h3>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MetricCard
          label="Diversification" value={`${divScore}`} unit="/100"
          interpretation={divScore >= 70 ? 'Good' : divScore >= 40 ? 'Moderate' : 'Low'}
          color={divScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : divScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
          tip={divScore >= 70
            ? 'Your portfolio is well diversified across holdings.'
            : divScore >= 40
              ? 'Consider adding more stocks from different sectors to reduce concentration risk.'
              : 'Your portfolio is heavily concentrated. Spread investments across 8-12 stocks in different sectors.'}
        />
        <MetricCard
          label="Beta" value={`${beta}`} unit="vs Nifty"
          interpretation={beta < 0.8 ? 'Defensive' : beta > 1.2 ? 'Aggressive' : 'Balanced'}
          color={beta <= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
          tip={beta > 1.2
            ? 'High beta means your portfolio swings more than the market. Add defensive stocks (FMCG, Pharma, Utilities) to lower it.'
            : beta < 0.8
              ? 'Low beta means less market sensitivity. Add growth stocks (IT, Banking) if you want higher returns.'
              : 'Your portfolio moves in line with the market — a balanced risk profile.'}
        />
        <MetricCard
          label="Volatility" value={`${volatility}%`} unit="annualized"
          interpretation={volatility < 15 ? 'Low' : volatility < 30 ? 'Medium' : 'High'}
          color={volatility < 15 ? 'text-emerald-600 dark:text-emerald-400' : volatility < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
          tip={volatility >= 30
            ? 'High volatility — your portfolio value fluctuates sharply. Add large-cap or debt-like instruments to stabilize.'
            : volatility >= 15
              ? 'Moderate swings. Consider rebalancing towards stable large-cap stocks to reduce volatility.'
              : 'Low volatility — your portfolio is relatively stable. Good for risk-averse investors.'}
        />
        <MetricCard
          label="Sharpe Ratio" value={`${sharpe}`} unit="risk-adj"
          interpretation={sharpe > 1 ? 'Good' : sharpe > 0 ? 'OK' : 'Poor'}
          color={sharpe > 1 ? 'text-emerald-600 dark:text-emerald-400' : sharpe > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
          tip={sharpe <= 0
            ? 'Returns are below the risk-free rate. Review underperformers and consider replacing them with stronger picks.'
            : sharpe <= 1
              ? 'Decent risk-adjusted returns. Trimming volatile low-return holdings can improve this ratio.'
              : 'Great risk-adjusted returns — you\'re being well compensated for the risk taken.'}
        />
        <MetricCard
          label="Max Drawdown" value={`-${maxDd}%`} unit="peak to trough"
          interpretation={maxDd < 10 ? 'Mild' : maxDd < 25 ? 'Moderate' : 'Severe'}
          color={maxDd < 10 ? 'text-emerald-600 dark:text-emerald-400' : maxDd < 25 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
          tip={maxDd >= 25
            ? 'Severe drawdown — consider adding stop losses, hedging, or shifting some allocation to defensive sectors.'
            : maxDd >= 10
              ? 'Moderate drawdown. Diversifying across uncorrelated sectors can reduce peak-to-trough falls.'
              : 'Minimal drawdown — your portfolio has been resilient during downturns.'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sector donut */}
        {sectorData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Sector Allocation</p>
            <div className="cursor-pointer">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    dataKey="weight"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    onClick={(_, idx) => {
                      setSelectedCap(null);
                      const sec = sectorData[idx]?.sector ?? null;
                      setSelectedSector((prev) => (prev === sec ? null : sec));
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      backgroundColor: '#1f2937',
                      color: '#e5e7eb',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mb-1">
              Click a sector to view holdings
            </p>
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              {sectorData.map((s, i) => (
                <button
                  key={s.sector}
                  type="button"
                  onClick={() => {
                    setSelectedCap(null);
                    setSelectedSector((prev) => (prev === s.sector ? null : s.sector));
                  }}
                  className={[
                    'inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 transition-colors max-w-full',
                    selectedSector === s.sector
                      ? 'font-semibold text-gray-900 dark:text-gray-100 bg-gray-200/80 dark:bg-gray-700/80'
                      : 'text-gray-500 dark:text-gray-400 hover:underline',
                  ].join(' ')}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{s.sector}</span> ({(s.weight * 100).toFixed(1)}%)
                </button>
              ))}
            </div>
            {selectedSector && sectorStocks[selectedSector] && sectorStocks[selectedSector].length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-2">
                  {selectedSector} holdings
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {sectorStocks[selectedSector].map((s) => {
                    const sectorIdx = sectorData.findIndex((d) => d.sector === selectedSector);
                    const dotColor = PIE_COLORS[sectorIdx >= 0 ? sectorIdx % PIE_COLORS.length : 0];
                    return (
                      <span
                        key={s.symbol}
                        title={s.name}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300"
                      >
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        {s.symbol.replace('.NS', '')} ({(s.weight * 100).toFixed(1)}%)
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stock-wise allocation donut */}
        {stockAllocation.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Stock Allocation</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stockAllocation}
                  dataKey="weight"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={1}
                >
                  {stockAllocation.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #374151',
                    backgroundColor: '#1f2937',
                    color: '#e5e7eb',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {stockAllocation.map((s, i) => (
                <span key={s.symbol} className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {s.symbol.replace('.NS', '')} ({(s.weight * 100).toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Market cap allocation donut */}
        {capData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Market Cap Allocation
            </p>
            <div className="cursor-pointer">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={capData}
                    dataKey="weight"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    onClick={(_, idx) => {
                      setSelectedSector(null);
                      const cat = capData[idx]?.category ?? null;
                      setSelectedCap((prev) => (prev === cat ? null : cat));
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {capData.map((c) => (
                      <Cell key={c.category} fill={capCategoryColor(c.category)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      backgroundColor: '#1f2937',
                      color: '#e5e7eb',
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mb-1">
              Click a category to view holdings
            </p>
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              {capData.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => {
                    setSelectedSector(null);
                    setSelectedCap((prev) => (prev === c.category ? null : c.category));
                  }}
                  className={[
                    'inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 transition-colors',
                    selectedCap === c.category
                      ? 'font-semibold text-gray-900 dark:text-gray-100 bg-gray-200/80 dark:bg-gray-700/80'
                      : 'text-gray-500 dark:text-gray-400 hover:underline',
                  ].join(' ')}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: capCategoryColor(c.category) }} />
                  {c.category} ({(c.weight * 100).toFixed(1)}%)
                </button>
              ))}
            </div>
            {selectedCap && capStocks[selectedCap] && capStocks[selectedCap]!.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center mb-2">
                  {selectedCap} holdings
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {capStocks[selectedCap]!.map((s) => (
                    <span
                      key={s.symbol}
                      title={s.name}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300"
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: capCategoryColor(selectedCap) }}
                      />
                      {s.symbol.replace('.NS', '')} ({(s.weight * 100).toFixed(1)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  );
}

function MetricCard({ label, value, unit, interpretation, color, tip }: {
  label: string; value: string; unit: string; interpretation: string; color: string; tip?: string;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="bg-gray-100 dark:bg-gray-700/50 rounded-xl px-3 py-3 text-center relative">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
        <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{unit}</p>
        <p className={`text-[10px] font-semibold mt-1 ${color}`}>{interpretation}</p>
        {tip && (
          <button
            onClick={() => setShowTip((v) => !v)}
            className="absolute -top-1.5 -right-1.5 group cursor-pointer"
            aria-label="Suggestion"
          >
            <span className="absolute inset-0 rounded-full bg-amber-400/25 dark:bg-amber-400/30 animate-ping" />
            <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 dark:group-hover:bg-amber-400 dark:group-hover:border-amber-400 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.45)] dark:group-hover:shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {showTip && tip && (
        <div className="mt-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-2 text-left">
          <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">{tip}</p>
        </div>
      )}
    </div>
  );
}
