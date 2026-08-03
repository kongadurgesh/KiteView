import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert as MuiAlert,
  alpha,
  Box,
  Button as MuiButton,
  Chip,
  CircularProgress,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAppNavigation } from "../../app/navigation";
import { PageLayout } from "../../components/layout/PageLayout";
import { Alert, TableSerialCell, TableSerialHeader } from "../../components/ui";
import { SectionHeader } from "../../components/ui";
import { PAGE_COPY } from "../../content/pageCopy";
import { fmtDistPct, fmtNumber } from "../../lib/format";
import {
  fetchSwotBatch,
  fetchWatchlistSnapshot,
} from "../../services/apiBatch";
import type {
  WatchlistAlerts,
  WatchlistItem,
  WatchlistSnapshot,
  WatchlistThesis,
} from "../../types/watchlist";
import { RenameWatchlistModal } from "./components/RenameWatchlistModal";
import { useWatchlists } from "./WatchlistProvider";
import {
  evaluateWatchlistAlerts,
  requestNotificationPermission,
} from "./watchlistAlerts";
import { useAuth } from "../../auth/AuthContext";

function SignalBadge({ signal }: { signal: "BUY" | "WAIT" }) {
  const isBuy = signal === "BUY";
  return (
    <Chip
      label={signal}
      size="small"
      color={isBuy ? "success" : "warning"}
      variant={isBuy ? "filled" : "outlined"}
      sx={{
        fontWeight: 700,
        fontSize: 11,
        borderRadius: 1,
        textTransform: "uppercase",
      }}
    />
  );
}

function ThesisPanel({
  item,
  onPatch,
}: {
  item: WatchlistItem;
  onPatch: (patch: {
    thesis?: Partial<WatchlistThesis>;
    alerts?: Partial<WatchlistAlerts>;
  }) => void;
}) {
  const [note, setNote] = useState(item.thesis.note);
  const [targetPrice, setTargetPrice] = useState(
    item.thesis.targetPrice?.toString() ?? "",
  );
  const [stopPrice, setStopPrice] = useState(
    item.thesis.stopPrice?.toString() ?? "",
  );
  const [entryBuyPrice, setEntryBuyPrice] = useState(
    item.thesis.entryBuyPrice?.toString() ?? "",
  );
  const [patternDate, setPatternDate] = useState(item.thesis.patternDate ?? "");

  useEffect(() => {
    setNote(item.thesis.note);
    setTargetPrice(item.thesis.targetPrice?.toString() ?? "");
    setStopPrice(item.thesis.stopPrice?.toString() ?? "");
    setEntryBuyPrice(item.thesis.entryBuyPrice?.toString() ?? "");
    setPatternDate(item.thesis.patternDate ?? "");
  }, [item]);

  const saveThesis = () => {
    onPatch({
      thesis: {
        note,
        targetPrice: targetPrice ? parseFloat(targetPrice) : null,
        stopPrice: stopPrice ? parseFloat(stopPrice) : null,
        entryBuyPrice: entryBuyPrice ? parseFloat(entryBuyPrice) : null,
        patternDate: patternDate || null,
      },
    });
  };

  return (
    <Box
      sx={{
        px: 2,
        pb: 2.5,
        pt: 1.5,
        bgcolor: "action.hover",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.75} sx={{ gridColumn: { md: "span 2" } }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700 }}
          >
            Thesis note
          </Typography>
          <TextField
            multiline
            rows={3}
            size="small"
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveThesis}
            placeholder="Why are you watching this name?"
            sx={{ "& .MuiInputBase-root": { borderRadius: 1 } }}
          />
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
        >
          {(
            [
              ["Target price", targetPrice, setTargetPrice],
              ["Stop price", stopPrice, setStopPrice],
              ["Entry buy price", entryBuyPrice, setEntryBuyPrice],
            ] as [string, string, (v: string) => void][]
          ).map(([label, val, setter]) => (
            <Stack key={label} spacing={0.75} sx={{ flex: "1 1 160px" }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                {label}
              </Typography>
              <TextField
                type="number"
                size="small"
                value={val}
                onChange={(e) => setter(e.target.value)}
                onBlur={saveThesis}
                sx={{ "& .MuiInputBase-root": { borderRadius: 1 } }}
              />
            </Stack>
          ))}
          <Stack spacing={0.75} sx={{ flex: "1 1 160px" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              Pattern date
            </Typography>
            <TextField
              type="date"
              size="small"
              value={patternDate}
              onChange={(e) => setPatternDate(e.target.value)}
              onBlur={saveThesis}
              sx={{ "& .MuiInputBase-root": { borderRadius: 1 } }}
            />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
          {(
            [
              ["buyWindow", "BUY window"],
              ["swotFlip", "SWOT flip"],
              ["patternToday", "Pattern today"],
            ] as const
          ).map(([key, label]) => (
            <Stack
              key={key}
              direction="row"
              spacing={0.75}
              alignItems="center"
              component="label"
              sx={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={item.alerts[key]}
                onChange={(e) =>
                  onPatch({ alerts: { [key]: e.target.checked } })
                }
              />
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

export function WatchlistPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, openLoginModal } = useAuth();
  const { viewStock } = useAppNavigation();
  const {
    lists,
    active,
    activeId,
    cloudLoading,
    setActiveId,
    addList,
    removeList,
    renameList,
    removeSymbol,
    patchItem,
  } = useWatchlists();
  const [snapshots, setSnapshots] = useState<Record<string, WatchlistSnapshot>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alertMessages, setAlertMessages] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [notifPerm, setNotifPerm] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const theme = useTheme();

  const symbolsKey = active?.items.map((i) => i.symbol).join(",") ?? "";

  const refreshSnapshots = useCallback(async () => {
    const symbols = symbolsKey ? symbolsKey.split(",") : [];
    if (symbols.length === 0) {
      setSnapshots({});
      setLastRefresh(new Date());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWatchlistSnapshot(symbols);
      const swotMap = await fetchSwotBatch(symbols);
      const merged = { ...data };
      for (const [symbol, swot] of Object.entries(swotMap)) {
        const snapshot = merged[symbol];
        if (!snapshot) continue;
        merged[symbol] = {
          ...snapshot,
          swotStrengths: swot.strengths,
          swotWeaknesses: swot.weaknesses,
          swotOpportunities: swot.opportunities,
          swotThreats: swot.threats,
        };
      }
      setSnapshots(merged);
      setLastRefresh(new Date());
      if (active?.items.length) {
        const fired = evaluateWatchlistAlerts(active.items, merged);
        if (fired.length)
          setAlertMessages((prev) => [...fired, ...prev].slice(0, 8));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, [symbolsKey, active?.items]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  useEffect(() => {
    const id = window.setInterval(
      () => {
        if (document.visibilityState === "visible") void refreshSnapshots();
      },
      5 * 60 * 1000,
    );
    return () => window.clearInterval(id);
  }, [refreshSnapshots]);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm === "unsupported" ? "unsupported" : perm);
  };

  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    addList(name);
    setNewListName("");
    setShowNewList(false);
  };

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }, [navigate]);

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
              "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(59,130,246,0.14) 55%, transparent 72%)",
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
              "radial-gradient(circle, rgba(16,185,129,0.24) 0%, rgba(245,158,11,0.12) 58%, transparent 76%)",
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
              "radial-gradient(1200px 180px at 0% -10%, rgba(99,102,241,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(16,185,129,0.12), transparent 55%)",
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
                {PAGE_COPY.watchlist.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PAGE_COPY.watchlist.description}
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
                  label="Live Alerts"
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  label="Price Tracking"
                  color="success"
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
              Sign in to access your watchlists
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
            {/* notification banner */}
            {notifPerm !== "granted" && notifPerm !== "unsupported" && (
              <MuiAlert
                severity="info"
                action={
                  <MuiButton
                    size="small"
                    color="inherit"
                    sx={{ textTransform: "none", fontWeight: 700 }}
                    onClick={() => void handleEnableNotifications()}
                  >
                    Enable
                  </MuiButton>
                }
              >
                Enable notifications to get BUY, SWOT, and pattern alerts when
                this page refreshes.
              </MuiAlert>
            )}

            {/* fired alerts */}
            {alertMessages.length > 0 && (
              <MuiAlert
                severity="info"
                action={
                  <MuiButton
                    size="small"
                    color="inherit"
                    sx={{ textTransform: "none" }}
                    onClick={() => setAlertMessages([])}
                  >
                    Dismiss
                  </MuiButton>
                }
              >
                <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
                  {alertMessages.map((msg, i) => (
                    <li key={`${msg}-${i}`}>{msg}</li>
                  ))}
                </Stack>
              </MuiAlert>
            )}

            {/* errors */}
            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            {/* list controls panel */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.75, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))"
                    : "linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
                useFlexGap
                flexWrap="wrap"
              >
                {/* left: list selector + actions */}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                >
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={activeId}
                      onChange={(e) => setActiveId(e.target.value)}
                      sx={{ borderRadius: 1, fontWeight: 600 }}
                    >
                      {lists.map((l) => (
                        <MenuItem key={l.id} value={l.id}>
                          {l.name} ({l.items.length})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {showNewList ? (
                    <>
                      <TextField
                        size="small"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCreateList()
                        }
                        sx={{
                          width: 150,
                          "& .MuiInputBase-root": { borderRadius: 1 },
                        }}
                      />
                      <MuiButton
                        size="small"
                        variant="contained"
                        onClick={handleCreateList}
                        sx={{
                          textTransform: "none",
                          borderRadius: 1,
                          fontWeight: 700,
                        }}
                      >
                        Create
                      </MuiButton>
                      <MuiButton
                        size="small"
                        variant="outlined"
                        onClick={() => setShowNewList(false)}
                        sx={{ textTransform: "none", borderRadius: 1 }}
                      >
                        Cancel
                      </MuiButton>
                    </>
                  ) : (
                    <MuiButton
                      size="small"
                      variant="outlined"
                      onClick={() => setShowNewList(true)}
                      sx={{ textTransform: "none", borderRadius: 1 }}
                    >
                      New list
                    </MuiButton>
                  )}

                  {active && lists.length > 1 && (
                    <MuiButton
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        if (window.confirm(`Delete "${active.name}"?`))
                          removeList(active.id);
                      }}
                      sx={{ textTransform: "none", borderRadius: 1 }}
                    >
                      Delete
                    </MuiButton>
                  )}

                  {active && (
                    <MuiButton
                      size="small"
                      variant="outlined"
                      onClick={() => setShowRenameModal(true)}
                      sx={{ textTransform: "none", borderRadius: 1 }}
                    >
                      Rename
                    </MuiButton>
                  )}
                </Stack>

                {/* right: refresh */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {lastRefresh && (
                    <Typography variant="caption" color="text.secondary">
                      Updated {lastRefresh.toLocaleTimeString()}
                    </Typography>
                  )}
                  <MuiButton
                    size="small"
                    variant="contained"
                    disabled={loading}
                    onClick={() => void refreshSnapshots()}
                    startIcon={
                      loading ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : undefined
                    }
                    sx={{
                      textTransform: "none",
                      borderRadius: 1,
                      fontWeight: 700,
                    }}
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </MuiButton>
                </Stack>
              </Stack>
            </Paper>

            {/* empty state */}
            {!active?.items.length && (
              <Paper
                elevation={0}
                sx={{
                  py: 8,
                  textAlign: "center",
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {PAGE_COPY.watchlist.empty}
                </Typography>
              </Paper>
            )}

            {/* watchlist table */}
            {active && active.items.length > 0 && (
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
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <SectionHeader title={active.name} />
                </Box>
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{
                      width: "100%",
                      minWidth: 760,
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
                        {[
                          "Stock",
                          "CMP",
                          "Signal",
                          "Buy",
                          "% vs Buy",
                          "Pattern",
                          "SWOT",
                          "Actions",
                        ].map((h, i) => (
                          <Box
                            component="th"
                            key={h}
                            sx={{
                              px: 1.5,
                              py: 1.25,
                              textAlign: i === 0 ? "left" : "right",
                              fontWeight: 700,
                              fontSize: 12,
                              letterSpacing: "0.04em",
                              color: "text.secondary",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {active.items.map((item, rowIndex) => {
                        const snap = snapshots[item.symbol];
                        const isExpanded = expanded === item.symbol;
                        return (
                          <Fragment key={item.symbol}>
                            <Box
                              component="tr"
                              sx={{
                                borderBottom: "1px solid",
                                borderColor: alpha(theme.palette.divider, 0.65),
                                "&:last-child": { borderBottom: 0 },
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                            >
                              <TableSerialCell index={rowIndex} />
                              <Box
                                component="td"
                                sx={{ px: 1.5, py: 1.25, textAlign: "left" }}
                              >
                                <Box
                                  component="button"
                                  type="button"
                                  onClick={() => viewStock(item.symbol)}
                                  sx={{
                                    textAlign: "left",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    p: 0,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 700,
                                      maxWidth: 180,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {snap?.shortName ?? item.shortName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontFamily: "monospace" }}
                                  >
                                    {item.symbol}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  px: 1.5,
                                  py: 1.25,
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontWeight: 600,
                                }}
                              >
                                {snap?.currentPrice
                                  ? fmtNumber(snap.currentPrice)
                                  : "—"}
                              </Box>
                              <Box
                                component="td"
                                sx={{ px: 1.5, py: 1.25, textAlign: "right" }}
                              >
                                {snap ? (
                                  <SignalBadge signal={snap.signal} />
                                ) : (
                                  "—"
                                )}
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  px: 1.5,
                                  py: 1.25,
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontWeight: 600,
                                }}
                              >
                                {snap?.buyPrice
                                  ? fmtNumber(snap.buyPrice)
                                  : "—"}
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  px: 1.5,
                                  py: 1.25,
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                }}
                              >
                                {snap?.buyPrice && snap.currentPrice
                                  ? fmtDistPct(snap.currentPrice, snap.buyPrice)
                                  : "—"}
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  px: 1.5,
                                  py: 1.25,
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                  color: "text.secondary",
                                }}
                              >
                                {snap?.patternDate ?? "—"}
                              </Box>
                              <Box
                                component="td"
                                sx={{
                                  px: 1.5,
                                  py: 1.25,
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontSize: 12,
                                }}
                              >
                                {snap?.swotStrengths != null &&
                                snap.swotWeaknesses != null ? (
                                  <Box component="span">
                                    <Box
                                      component="span"
                                      sx={{ color: "success.main" }}
                                    >
                                      {snap.swotStrengths}
                                    </Box>
                                    <Box
                                      component="span"
                                      sx={{ color: "text.secondary" }}
                                    >
                                      /
                                    </Box>
                                    <Box
                                      component="span"
                                      sx={{ color: "error.main" }}
                                    >
                                      {snap.swotWeaknesses}
                                    </Box>
                                    {snap.swotOpportunities != null &&
                                      snap.swotThreats != null && (
                                        <>
                                          <Box
                                            component="span"
                                            sx={{ color: "text.secondary" }}
                                          >
                                            /
                                          </Box>
                                          <Box
                                            component="span"
                                            sx={{ color: "success.main" }}
                                          >
                                            {snap.swotOpportunities}
                                          </Box>
                                          <Box
                                            component="span"
                                            sx={{ color: "text.secondary" }}
                                          >
                                            /
                                          </Box>
                                          <Box
                                            component="span"
                                            sx={{ color: "error.main" }}
                                          >
                                            {snap.swotThreats}
                                          </Box>
                                        </>
                                      )}
                                  </Box>
                                ) : (
                                  "—"
                                )}
                              </Box>
                              <Box
                                component="td"
                                sx={{ px: 1.5, py: 1.25, textAlign: "right" }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  justifyContent="flex-end"
                                >
                                  <MuiButton
                                    size="small"
                                    variant="text"
                                    sx={{
                                      textTransform: "none",
                                      minWidth: 0,
                                      px: 0.5,
                                      fontSize: 12,
                                    }}
                                    onClick={() =>
                                      setExpanded(
                                        isExpanded ? null : item.symbol,
                                      )
                                    }
                                  >
                                    {isExpanded ? "Hide" : "Thesis"}
                                  </MuiButton>
                                  <MuiButton
                                    size="small"
                                    variant="text"
                                    color="error"
                                    sx={{
                                      textTransform: "none",
                                      minWidth: 0,
                                      px: 0.5,
                                      fontSize: 12,
                                    }}
                                    onClick={() => removeSymbol(item.symbol)}
                                  >
                                    Remove
                                  </MuiButton>
                                </Stack>
                              </Box>
                            </Box>
                            {isExpanded && (
                              <Box component="tr">
                                <Box component="td" colSpan={9}>
                                  <ThesisPanel
                                    item={item}
                                    onPatch={(patch) =>
                                      patchItem(item.symbol, patch)
                                    }
                                  />
                                </Box>
                              </Box>
                            )}
                          </Fragment>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            )}

            {showRenameModal && active && (
              <RenameWatchlistModal
                currentName={active.name}
                onSave={(name) => {
                  renameList(active.id, name);
                  setShowRenameModal(false);
                }}
                onClose={() => setShowRenameModal(false)}
              />
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
