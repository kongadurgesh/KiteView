import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button as MuiButton,
  Chip,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { Portfolio, Position, Transaction } from "../../types";
import {
  loadPortfolioFromCloud,
  savePortfolio,
  addTransaction,
  getPositions,
  removePosition,
  clearPortfolio,
  savePortfolioToCloud,
} from "../../utils/portfolio";
import { useAuth } from "../../auth/AuthContext";
import { fetchBatchQuotesDetailed } from "../../services/fetchStockData";
import { fetchSwotBatch, type SwotCounts } from "../../services/apiBatch";
import { PageLayout } from "../../components/layout/PageLayout";
import { PAGE_COPY } from "../../content/pageCopy";
import { fmtNumber } from "../../lib/format";
import { AddTransactionModal } from "./components/AddTransactionModal";
import { ImportExcelModal } from "./components/ImportExcelModal";
import { TransactionHistory } from "./components/TransactionHistory";
import { PerformanceChart } from "./components/PerformanceChart";
import { RiskDashboard } from "./components/RiskDashboard";
import { TableSerialCell, TableSerialHeader } from "../../components/ui";
import { SectionHeader } from "../../components/ui";
type SortKey =
  | "name"
  | "qty"
  | "avgBuy"
  | "cmp"
  | "invested"
  | "current"
  | "pnl"
  | "pnlPct"
  | "todayPnl"
  | "todayPnlPct"
  | "swot";
type SortDir = "asc" | "desc";

interface PositionRow {
  pos: Position;
  cmp: number;
  currentValue: number;
  unrealized: number;
  unrealizedPct: number;
  todayPnl: number;
  todayPnlPct: number;
  isClosed: boolean;
  swot?: SwotCounts | null;
}

function buildRow(
  pos: Position,
  livePrices: Record<string, number>,
  livePrevClose: Record<string, number>,
  swot?: SwotCounts | null,
): PositionRow {
  const cmp = livePrices[pos.symbol] ?? 0;
  const prevClose = livePrevClose[pos.symbol];
  const currentValue = cmp * pos.totalQty;
  const unrealized = cmp ? (cmp - pos.avgBuyPrice) * pos.totalQty : 0;
  const unrealizedPct =
    pos.investedAmount > 0 && cmp ? (unrealized / pos.investedAmount) * 100 : 0;
  const isClosed = pos.totalQty === 0;
  const todayPnl =
    !isClosed && cmp && prevClose ? (cmp - prevClose) * pos.totalQty : 0;
  const prevValue = !isClosed && prevClose ? prevClose * pos.totalQty : 0;
  const todayPnlPct = prevValue > 0 ? (todayPnl / prevValue) * 100 : 0;
  return {
    pos,
    cmp,
    currentValue,
    unrealized,
    unrealizedPct,
    todayPnl,
    todayPnlPct,
    isClosed,
    swot,
  };
}

function getSwotSortValue(swot?: SwotCounts | null): number {
  return swot?.strengths ?? -1;
}

function getSortValue(row: PositionRow, key: SortKey): number | string {
  switch (key) {
    case "name":
      return row.pos.stockName.toLowerCase();
    case "qty":
      return row.pos.totalQty;
    case "avgBuy":
      return row.pos.avgBuyPrice;
    case "cmp":
      return row.cmp;
    case "invested":
      return row.pos.investedAmount;
    case "current":
      return row.currentValue;
    case "pnl":
      return row.unrealized;
    case "pnlPct":
      return row.unrealizedPct;
    case "todayPnl":
      return row.todayPnl;
    case "todayPnlPct":
      return row.todayPnlPct;
    case "swot":
      return getSwotSortValue(row.swot);
  }
}

export function PortfolioPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, openLoginModal } = useAuth();
  const theme = useTheme();
  const [portfolio, setPortfolio] = useState<Portfolio>({ positions: {} });
  const [cloudLoading, setCloudLoading] = useState(false);
  const cloudReady = useRef(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [livePrevClose, setLivePrevClose] = useState<Record<string, number>>(
    {},
  );
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [swotMap, setSwotMap] = useState<Record<string, SwotCounts>>({});
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDeletePortfolioModal, setShowDeletePortfolioModal] =
    useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Load from cloud when user changes
  useEffect(() => {
    cloudReady.current = false;
    if (!user) {
      setPortfolio({ positions: {} });
      setLivePrices({});
      return;
    }
    setCloudLoading(true);
    loadPortfolioFromCloud(user.id).then((p) => {
      setPortfolio(p);
      cloudReady.current = true;
      setCloudLoading(false);
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to cloud whenever portfolio changes (after initial cloud load)
  useEffect(() => {
    if (!user?.id || !cloudReady.current) return;
    savePortfolioToCloud(user.id, portfolio);
  }, [portfolio, user?.id]);

  const positions = getPositions(portfolio);
  const activePositions = positions.filter((p) => p.totalQty > 0);
  const positionSymbols = useMemo(
    () => positions.map((p) => p.symbol),
    [positions],
  );

  useEffect(() => {
    if (positionSymbols.length === 0) {
      setSwotMap({});
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const nextSwotMap = await fetchSwotBatch(positionSymbols);
        if (!cancelled) setSwotMap(nextSwotMap);
      } catch {
        if (!cancelled) setSwotMap({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [positionSymbols.join(",")]);

  const refreshPrices = useCallback(async () => {
    const symbols = activePositions.map((p) => p.symbol);
    if (symbols.length === 0) return;
    setLoadingPrices(true);
    try {
      const detailed = await fetchBatchQuotesDetailed(symbols);
      const prices: Record<string, number> = {};
      const prevClose: Record<string, number> = {};
      for (const [sym, data] of Object.entries(detailed)) {
        prices[sym] = data.price;
        prevClose[sym] = data.previousClose;
      }
      setLivePrices(prices);
      setLivePrevClose(prevClose);
    } finally {
      setLoadingPrices(false);
    }
  }, [activePositions.map((p) => p.symbol).join(",")]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  const rows: PositionRow[] = useMemo(() => {
    const built = positions.map((p) =>
      buildRow(p, livePrices, livePrevClose, swotMap[p.symbol]),
    );
    built.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      let cmp = 0;
      if (typeof va === "string" && typeof vb === "string")
        cmp = va.localeCompare(vb);
      else cmp = (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return built;
  }, [positions, livePrices, livePrevClose, swotMap, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleAdd = (data: {
    symbol: string;
    stockName: string;
    type: "BUY" | "SELL";
    qty: number;
    price: number;
    date: string;
  }) => {
    const txn: Transaction = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now(),
    };
    try {
      const updated = addTransaction(portfolio, txn);
      setPortfolio(updated);
      savePortfolio(updated);
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add transaction");
    }
  };

  const handleRemove = (symbol: string) => {
    if (!confirm(`Remove ${symbol} and all its transactions?`)) return;
    const updated = removePosition(portfolio, symbol);
    setPortfolio(updated);
    savePortfolio(updated);
    setExpandedSymbol(null);
  };

  const handleImportRows = (
    importedRows: {
      symbol: string;
      stockName: string;
      qty: number;
      price: number;
    }[],
  ) => {
    let updated = portfolio;
    for (const row of importedRows) {
      const txn: Transaction = {
        id: crypto.randomUUID(),
        symbol: row.symbol,
        stockName: row.stockName,
        type: "BUY",
        qty: row.qty,
        price: row.price,
        date: new Date().toISOString().split("T")[0],
        createdAt: Date.now(),
      };
      updated = addTransaction(updated, txn);
    }
    setPortfolio(updated);
    savePortfolio(updated);
    setShowImport(false);
  };

  const handleClearPortfolio = () => {
    const empty = clearPortfolio();
    setPortfolio(empty);
    setLivePrices({});
    setExpandedSymbol(null);
    setShowDeletePortfolioModal(false);
  };

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }, [navigate]);

  const maxSellQty: Record<string, number> = {};
  for (const p of positions) {
    if (p.totalQty > 0) maxSellQty[p.symbol] = p.totalQty;
  }

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalRealizedPnl = 0;
  for (const p of activePositions) {
    totalInvested += p.investedAmount;
    const lp = livePrices[p.symbol];
    if (lp) totalCurrentValue += lp * p.totalQty;
    else totalCurrentValue += p.investedAmount;
  }
  for (const p of positions) {
    totalRealizedPnl += p.realizedPnl;
  }
  const totalUnrealizedPnl = totalCurrentValue - totalInvested;
  const totalPnlPct =
    totalInvested > 0
      ? ((totalUnrealizedPnl + totalRealizedPnl) / totalInvested) * 100
      : 0;

  let todayPnl = 0;
  let totalPrevValue = 0;
  for (const p of activePositions) {
    const price = livePrices[p.symbol];
    const prevClose = livePrevClose[p.symbol];
    if (price && prevClose) {
      todayPnl += (price - prevClose) * p.totalQty;
      totalPrevValue += prevClose * p.totalQty;
    }
  }
  const todayPnlPct =
    totalPrevValue > 0 ? (todayPnl / totalPrevValue) * 100 : 0;

  return (
    <PageLayout className="max-w-7xl mt-6">
      <Stack spacing={2.25} sx={{ position: "relative", isolation: "isolate" }}>
        {/* ambient blobs */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            zIndex: -1,
            width: { xs: 240, md: 320 },
            height: { xs: 240, md: 320 },
            borderRadius: "50%",
            top: -100,
            left: -100,
            filter: "blur(38px)",
            opacity: 0.34,
            background:
              "radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(234,179,8,0.14) 55%, transparent 72%)",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            zIndex: -1,
            width: { xs: 260, md: 340 },
            height: { xs: 260, md: 340 },
            borderRadius: "50%",
            bottom: -120,
            right: -80,
            filter: "blur(42px)",
            opacity: 0.24,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.24) 0%, rgba(99,102,241,0.12) 58%, transparent 76%)",
          }}
        />

        {/* hero */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            minHeight: { xs: 190, md: 176 },
            border: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(8px)",
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(1200px 180px at 0% -10%, rgba(245,158,11,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(16,185,129,0.12), transparent 55%)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              opacity: 0.5,
              pointerEvents: "none",
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.03) 70%)",
              transform: "translateX(-40%)",
              animation: "ovHeroSweep 6s ease-in-out infinite",
            }}
          />
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            sx={{ minHeight: "100%" }}
          >
            <Box>
              <MuiButton
                variant="text"
                size="small"
                startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                onClick={handleBack}
                sx={{
                  mb: 1,
                  px: 0.5,
                  minWidth: 0,
                  textTransform: "none",
                  justifyContent: "flex-start",
                }}
              >
                Back
              </MuiButton>
              <Typography variant="h5" sx={{ mb: 0.75 }}>
                {PAGE_COPY.portfolio.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.portfolio.description}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1.5, flexWrap: "wrap", rowGap: 1 }}
              >
                <Chip
                  size="small"
                  label="Cloud Sync"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label="Live P&L"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label="Risk Analytics"
                  color="warning"
                  variant="outlined"
                />
              </Stack>
            </Box>
            <Box />
          </Stack>
        </Paper>

        {/* loading / unauth states */}
        {authLoading || cloudLoading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
            sx={{ py: 12 }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </Stack>
        ) : !user ? (
          <Paper
            elevation={0}
            sx={{
              py: 10,
              px: 4,
              border: "1px solid",
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <LockOutlinedIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 2 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.75 }}>
              Sign in to access your portfolio
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your data is stored securely in the cloud and accessible from any
              browser.
            </Typography>
            <MuiButton
              variant="contained"
              onClick={openLoginModal}
              sx={{ textTransform: "none", borderRadius: 1, fontWeight: 700 }}
            >
              Sign In
            </MuiButton>
          </Paper>
        ) : (
          <>
            {/* Portfolio section */}
            <CollapsibleSection title="Portfolio">
              {/* action buttons */}
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                justifyContent="flex-end"
                sx={{ mb: 2.5 }}
              >
                <MuiButton
                  size="small"
                  variant="outlined"
                  disabled={loadingPrices}
                  onClick={refreshPrices}
                  startIcon={
                    loadingPrices ? (
                      <CircularProgress size={12} color="inherit" />
                    ) : undefined
                  }
                  sx={{ textTransform: "none", borderRadius: 1 }}
                >
                  {loadingPrices ? "Refreshing…" : "Refresh Prices"}
                </MuiButton>
                <MuiButton
                  size="small"
                  variant="outlined"
                  onClick={() => setShowImport(true)}
                  sx={{ textTransform: "none", borderRadius: 1 }}
                >
                  Import CSV
                </MuiButton>
                <MuiButton
                  size="small"
                  variant="contained"
                  onClick={() => setShowModal(true)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 1,
                    fontWeight: 700,
                  }}
                >
                  + Add Transaction
                </MuiButton>
                {positions.length > 0 && (
                  <MuiButton
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setShowDeletePortfolioModal(true)}
                    sx={{ textTransform: "none", borderRadius: 1 }}
                  >
                    Delete Portfolio
                  </MuiButton>
                )}
              </Stack>

              {/* summary cards */}
              {activePositions.length > 0 && (
                <Stack
                  direction={{ xs: "row", sm: "row" }}
                  spacing={1.5}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mb: 0 }}
                >
                  <SummaryCard
                    label="Invested"
                    value={fmtNumber(totalInvested)}
                  />
                  <SummaryCard
                    label="Current Value"
                    value={fmtNumber(totalCurrentValue)}
                  />
                  <SummaryCard
                    label="Total P&L"
                    value={`${totalUnrealizedPnl >= 0 ? "+" : ""}${fmtNumber(totalUnrealizedPnl)}`}
                    gain={totalUnrealizedPnl >= 0}
                    sub={`${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}%${totalRealizedPnl !== 0 ? ` · Realized: ${totalRealizedPnl >= 0 ? "+" : ""}${fmtNumber(totalRealizedPnl)}` : ""}`}
                  />
                  <SummaryCard
                    label="Day's P&L"
                    value={`${todayPnl >= 0 ? "+" : ""}${fmtNumber(todayPnl)}`}
                    gain={todayPnl >= 0}
                    sub={`${todayPnlPct >= 0 ? "+" : ""}${todayPnlPct.toFixed(2)}%`}
                  />
                </Stack>
              )}
            </CollapsibleSection>

            {/* Performance section */}
            <CollapsibleSection title="Performance">
              <PerformanceChart portfolio={portfolio} embedded />
            </CollapsibleSection>

            {/* Risk section */}
            <CollapsibleSection title="Risk Analytics">
              <RiskDashboard
                portfolio={portfolio}
                livePrices={livePrices}
                embedded
              />
            </CollapsibleSection>

            {/* Holdings section */}
            <CollapsibleSection title="Holdings">
              {positions.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  No positions yet. Add a transaction to get started.
                </Typography>
              ) : (
                <Box sx={{ overflowX: "auto", mx: -1 }}>
                  <Box
                    component="table"
                    sx={{
                      width: "100%",
                      minWidth: 980,
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <Box
                      component="thead"
                      sx={{
                        bgcolor: "action.hover",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box component="tr">
                        <TableSerialHeader />
                        <SortHeader
                          label="Name"
                          sortKey="name"
                          current={sortKey}
                          dir={sortDir}
                          onSort={toggleSort}
                          align="left"
                        />
                        <SortHeader
                          label="SWOT"
                          sortKey="swot"
                          current={sortKey}
                          dir={sortDir}
                          onSort={toggleSort}
                          align="right"
                        />
                        {(
                          [
                            ["qty", "Qty", "right"],
                            ["avgBuy", "Avg Buy", "right"],
                            ["cmp", "CMP", "right"],
                            ["invested", "Invested", "right"],
                            ["current", "Current", "right"],
                            ["pnl", "P&L", "right"],
                            ["pnlPct", "P&L %", "right"],
                            ["todayPnl", "Day P&L", "right"],
                            ["todayPnlPct", "Day %", "right"],
                          ] as [SortKey, string, "left" | "right"][]
                        ).map(([k, lbl, al]) => (
                          <SortHeader
                            key={k}
                            label={lbl}
                            sortKey={k}
                            current={sortKey}
                            dir={sortDir}
                            onSort={toggleSort}
                            align={al}
                          />
                        ))}
                        <Box
                          component="th"
                          sx={{ px: 1.5, py: 1.25, width: 48 }}
                        />
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {rows.map(
                        (
                          {
                            pos,
                            cmp,
                            currentValue,
                            unrealized,
                            unrealizedPct,
                            todayPnl: rowTodayPnl,
                            todayPnlPct: rowTodayPnlPct,
                            isClosed,
                          },
                          rowIndex,
                        ) => (
                          <PositionTableRow
                            key={pos.symbol}
                            rowIndex={rowIndex}
                            pos={pos}
                            cmp={cmp}
                            currentValue={currentValue}
                            todayPnl={rowTodayPnl}
                            todayPnlPct={rowTodayPnlPct}
                            unrealized={unrealized}
                            unrealizedPct={unrealizedPct}
                            swot={swotMap[pos.symbol]}
                            isClosed={isClosed}
                            isExpanded={expandedSymbol === pos.symbol}
                            loadingPrices={loadingPrices}
                            onToggle={() =>
                              setExpandedSymbol(
                                expandedSymbol === pos.symbol
                                  ? null
                                  : pos.symbol,
                              )
                            }
                            onRemove={() => handleRemove(pos.symbol)}
                            onOpenAnalysis={(symbol) =>
                              navigate(
                                `/analysis?symbol=${encodeURIComponent(symbol)}`,
                              )
                            }
                          />
                        ),
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </CollapsibleSection>

            {/* modals */}
            {showModal && (
              <AddTransactionModal
                onAdd={handleAdd}
                onClose={() => setShowModal(false)}
                maxSellQty={maxSellQty}
              />
            )}
            {showImport && (
              <ImportExcelModal
                onImport={handleImportRows}
                onClose={() => setShowImport(false)}
              />
            )}
            {showDeletePortfolioModal && (
              <Paper
                elevation={8}
                sx={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 1300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(theme.palette.background.default, 0.7),
                  backdropFilter: "blur(4px)",
                }}
                onClick={() => setShowDeletePortfolioModal(false)}
              >
                <Paper
                  elevation={4}
                  sx={{
                    p: 3,
                    maxWidth: 400,
                    width: "90%",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    Delete portfolio
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Delete entire portfolio? This will remove all positions and
                    transaction history.
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <MuiButton
                      variant="outlined"
                      onClick={() => setShowDeletePortfolioModal(false)}
                      sx={{ textTransform: "none", borderRadius: 1 }}
                    >
                      Cancel
                    </MuiButton>
                    <MuiButton
                      variant="contained"
                      color="error"
                      onClick={handleClearPortfolio}
                      sx={{
                        textTransform: "none",
                        borderRadius: 1,
                        fontWeight: 700,
                      }}
                    >
                      Delete Portfolio
                    </MuiButton>
                  </Stack>
                </Paper>
              </Paper>
            )}
          </>
        )}

        <style>{`
          @keyframes ovHeroSweep {
            0%, 100% { transform: translateX(-45%); }
            50% { transform: translateX(45%); }
          }
        `}</style>
      </Stack>
    </PageLayout>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))"
            : "linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          transition: "background 0.15s",
        }}
      >
        <SectionHeader title={title} />
        {open ? (
          <KeyboardArrowUpRoundedIcon
            fontSize="small"
            sx={{ color: "text.secondary", flexShrink: 0 }}
          />
        ) : (
          <KeyboardArrowDownRoundedIcon
            fontSize="small"
            sx={{ color: "text.secondary", flexShrink: 0 }}
          />
        )}
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5, pt: 0.5 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

function PositionTableRow({
  rowIndex,
  pos,
  cmp,
  currentValue,
  unrealized,
  unrealizedPct,
  todayPnl,
  todayPnlPct,
  swot,
  isClosed,
  isExpanded,
  loadingPrices,
  onToggle,
  onRemove,
  onOpenAnalysis,
}: {
  rowIndex: number;
  pos: Position;
  cmp: number;
  currentValue: number;
  unrealized: number;
  unrealizedPct: number;
  todayPnl: number;
  todayPnlPct: number;
  swot?: SwotCounts | null;
  isClosed: boolean;
  isExpanded: boolean;
  loadingPrices: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onOpenAnalysis: (symbol: string) => void;
}) {
  const theme = useTheme();
  const pnlColor = unrealized >= 0 ? "success.main" : "error.main";
  const dayColor = todayPnl >= 0 ? "success.main" : "error.main";
  const mono = { fontFamily: "monospace" };

  return (
    <>
      <Box
        component="tr"
        onClick={onToggle}
        sx={{
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.65),
          cursor: "pointer",
          opacity: isClosed ? 0.5 : 1,
          "&:hover": { bgcolor: "action.hover" },
          "&:last-child": { borderBottom: 0 },
        }}
      >
        <TableSerialCell index={rowIndex} />
        <Box component="td" sx={{ px: 1.5, py: 1.25, textAlign: "left" }}>
          <Box
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAnalysis(pos.symbol);
            }}
            sx={{
              background: "none",
              border: "none",
              p: 0,
              textAlign: "left",
              cursor: "pointer",
              color: "inherit",
              "&:hover .name-text": { color: "primary.main" },
            }}
          >
            <Typography
              variant="body2"
              className="name-text"
              sx={{
                fontWeight: 700,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pos.stockName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: "monospace", display: "block" }}
            >
              {pos.symbol}
            </Typography>
          </Box>
          {isClosed && (
            <Chip
              label="Closed"
              size="small"
              sx={{ fontSize: 9, height: 16, ml: 0.5 }}
            />
          )}
        </Box>
        <Box
          component="td"
          sx={{
            px: 1.5,
            py: 1.25,
            textAlign: "right",
            fontFamily: "monospace",
            fontSize: 12,
            whiteSpace: "nowrap",
            minWidth: { xs: 92, sm: 112 },
          }}
        >
          <SwotValue counts={swot} />
        </Box>
        <Box
          component="td"
          sx={{ px: 1.5, py: 1.25, textAlign: "right", ...mono }}
        >
          {isClosed ? "—" : pos.totalQty}
        </Box>
        <Box
          component="td"
          sx={{ px: 1.5, py: 1.25, textAlign: "right", ...mono }}
        >
          {isClosed ? "—" : fmtNumber(pos.avgBuyPrice)}
        </Box>
        <Box
          component="td"
          sx={{ px: 1.5, py: 1.25, textAlign: "right", ...mono }}
        >
          {isClosed ? "—" : cmp ? fmtNumber(cmp) : loadingPrices ? "…" : "—"}
        </Box>
        <Box
          component="td"
          sx={{ px: 1.5, py: 1.25, textAlign: "right", ...mono }}
        >
          {isClosed ? "—" : fmtNumber(pos.investedAmount)}
        </Box>
        <Box
          component="td"
          sx={{ px: 1.5, py: 1.25, textAlign: "right", ...mono }}
        >
          {isClosed ? "—" : cmp ? fmtNumber(currentValue) : "—"}
        </Box>
        <Box
          component="td"
          sx={{
            px: 1.5,
            py: 1.25,
            textAlign: "right",
            fontWeight: 600,
            color: isClosed ? "text.disabled" : pnlColor,
            ...mono,
          }}
        >
          {isClosed
            ? "—"
            : `${unrealized >= 0 ? "+" : ""}${fmtNumber(unrealized)}`}
        </Box>
        <Box
          component="td"
          sx={{
            px: 1.5,
            py: 1.25,
            textAlign: "right",
            fontWeight: 600,
            color: isClosed ? "text.disabled" : pnlColor,
            ...mono,
          }}
        >
          {isClosed
            ? "—"
            : `${unrealizedPct >= 0 ? "+" : ""}${unrealizedPct.toFixed(2)}%`}
        </Box>
        <Box
          component="td"
          sx={{
            px: 1.5,
            py: 1.25,
            textAlign: "right",
            fontWeight: 600,
            color: isClosed ? "text.disabled" : dayColor,
            ...mono,
          }}
        >
          {isClosed
            ? "—"
            : cmp
              ? `${todayPnl >= 0 ? "+" : ""}${fmtNumber(todayPnl)}`
              : "—"}
        </Box>
        <Box
          component="td"
          sx={{
            px: 1.5,
            py: 1.25,
            textAlign: "right",
            fontWeight: 600,
            color: isClosed ? "text.disabled" : dayColor,
            ...mono,
          }}
        >
          {isClosed
            ? "—"
            : cmp
              ? `${todayPnlPct >= 0 ? "+" : ""}${todayPnlPct.toFixed(2)}%`
              : "—"}
        </Box>
        <Box component="td" sx={{ px: 1, py: 1.25, textAlign: "center" }}>
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            alignItems="center"
          >
            <Box
              component="button"
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRemove();
              }}
              title="Remove position"
              sx={{
                background: "none",
                border: "none",
                cursor: "pointer",
                p: 0.5,
                color: "text.disabled",
                "&:hover": { color: "error.main" },
                display: "flex",
                alignItems: "center",
              }}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </Box>
            {isExpanded ? (
              <KeyboardArrowUpRoundedIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
            ) : (
              <KeyboardArrowDownRoundedIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
            )}
          </Stack>
        </Box>
      </Box>
      {isExpanded && (
        <Box component="tr">
          <Box component="td" colSpan={13}>
            <TransactionHistory transactions={pos.transactions} />
          </Box>
        </Box>
      )}
    </>
  );
}

function SwotValue({ counts }: { counts?: SwotCounts | null }) {
  if (!counts || counts.strengths == null || counts.weaknesses == null)
    return <>—</>;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        flexWrap: "nowrap",
        justifyContent: "flex-end",
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span" sx={{ color: "success.main" }}>
        {counts.strengths}
      </Box>
      <Box component="span" sx={{ color: "text.secondary" }}>
        /
      </Box>
      <Box component="span" sx={{ color: "error.main" }}>
        {counts.weaknesses}
      </Box>
      {counts.opportunities != null && counts.threats != null && (
        <>
          <Box component="span" sx={{ color: "text.secondary" }}>
            /
          </Box>
          <Box component="span" sx={{ color: "success.main" }}>
            {counts.opportunities}
          </Box>
          <Box component="span" sx={{ color: "text.secondary" }}>
            /
          </Box>
          <Box component="span" sx={{ color: "error.main" }}>
            {counts.threats}
          </Box>
        </>
      )}
    </Box>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = current === sortKey;
  return (
    <Box
      component="th"
      onClick={() => onSort(sortKey)}
      sx={{
        px: 1.5,
        py: 1.25,
        textAlign: align,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "0.04em",
        color: isActive ? "primary.main" : "text.secondary",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        "&:hover": { color: "text.primary" },
      }}
    >
      {label}
      {isActive ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  gain,
  sub,
}: {
  label: string;
  value: string;
  gain?: boolean;
  sub?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: "1 1 140px",
        px: 2,
        py: 1.5,
        textAlign: "center",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
          display: "block",
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          fontFamily: "monospace",
          color:
            gain === undefined
              ? "text.primary"
              : gain
                ? "success.main"
                : "error.main",
        }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Paper>
  );
}
