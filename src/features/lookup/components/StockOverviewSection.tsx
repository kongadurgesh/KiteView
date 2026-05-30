import { Box, Chip, Grid, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { StockStats } from '../../../types/stockStats';
import type { QuoteSnapshot } from '../quoteSnapshot';
import { fmtMarketCap, fmtMarketCapCr, fmtMoney, fmtPct, fmtQuotePct, fmtRatio, fmtVolume } from '../../../lib/format';
import { isIndianSymbol } from '../../../lib/nseSymbol';
import { capCategoryColor, getCapCategory } from '../../../lib/marketCap';

interface Props {
  symbol: string;
  currentPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  allTimeHigh: number;
  marketCapCr: number;
  sector: string;
  industry: string;
  quoteSnapshot: QuoteSnapshot | null;
  stockStats: StockStats | null;
}

export function StockOverviewSection({
  symbol,
  currentPrice,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  allTimeHigh,
  marketCapCr,
  sector,
  industry,
  quoteSnapshot,
  stockStats,
}: Props) {
  const theme = useTheme();
  const indian = isIndianSymbol(symbol);
  const capCategory = getCapCategory(marketCapCr);
  const capColor = capCategoryColor(capCategory);
  const ch = quoteSnapshot?.change;
  const chPct = quoteSnapshot?.changePercent;
  const dayColor =
    ch != null && ch >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400';

  const hasQuote =
    quoteSnapshot &&
    [quoteSnapshot.change, quoteSnapshot.changePercent, quoteSnapshot.previousClose, quoteSnapshot.dayHigh, quoteSnapshot.dayLow, quoteSnapshot.volume].some(
      (v) => v != null,
    );

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} useFlexGap flexWrap="wrap">
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          Overview
        </Typography>
        {indian && marketCapCr > 0 && (
          <Chip
            size="small"
            label={`${capCategory} · ${fmtMarketCapCr(marketCapCr)}`}
            sx={{
              fontWeight: 700,
              color: capColor,
              bgcolor: alpha(capColor, theme.palette.mode === 'dark' ? 0.18 : 0.12),
              borderRadius: 1,
            }}
          />
        )}
        {(sector || industry) && (
          <Typography variant="caption" color="text.secondary">
            {[industry, sector].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Stack>

      {hasQuote && quoteSnapshot && (
        <Grid container spacing={1.25}>
          <MiniStat
            label="Day chg"
            value={ch != null ? `${ch >= 0 ? '+' : '-'}${fmtMoney(Math.abs(ch), symbol)}` : '—'}
            valueClass={ch != null ? dayColor : undefined}
          />
          <MiniStat label="Day chg %" value={chPct != null ? fmtQuotePct(chPct) : '—'} valueClass={chPct != null ? dayColor : undefined} />
          <MiniStat label="Prev close" value={quoteSnapshot.previousClose != null ? fmtMoney(quoteSnapshot.previousClose, symbol) : '—'} />
          <MiniStat label="Day high" value={quoteSnapshot.dayHigh != null ? fmtMoney(quoteSnapshot.dayHigh, symbol) : '—'} />
          <MiniStat label="Day low" value={quoteSnapshot.dayLow != null ? fmtMoney(quoteSnapshot.dayLow, symbol) : '—'} />
          <MiniStat label="Volume" value={fmtVolume(quoteSnapshot.volume)} />
        </Grid>
      )}

      {stockStats && (
        <Grid container spacing={1.25}>
          <MiniStat label="P/E" value={fmtRatio(stockStats.pe)} />
          <MiniStat label="Fwd P/E" value={fmtRatio(stockStats.forwardPE)} />
          <MiniStat label="P/B" value={fmtRatio(stockStats.pb)} />
          <MiniStat label="Beta" value={fmtRatio(stockStats.beta)} />
          <MiniStat label="52W chg" value={fmtPct(stockStats.fiftyTwoWeekChange)} />
          <MiniStat label="Mkt cap" value={fmtMarketCap(stockStats.marketCap, indian)} />
        </Grid>
      )}

      <Grid container spacing={1.25}>
        <MiniStat
          label="52W high"
          value={fmtMoney(fiftyTwoWeekHigh, symbol)}
          note={
            currentPrice > 0 && fiftyTwoWeekHigh > 0
              ? `${((1 - currentPrice / fiftyTwoWeekHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
        <MiniStat
          label="52W low"
          value={fmtMoney(fiftyTwoWeekLow, symbol)}
          note={
            currentPrice > 0 && fiftyTwoWeekLow > 0
              ? `${(((currentPrice / fiftyTwoWeekLow) - 1) * 100).toFixed(1)}% above`
              : undefined
          }
        />
        <MiniStat
          label="All-time high"
          value={fmtMoney(allTimeHigh, symbol)}
          note={
            currentPrice > 0 && allTimeHigh > 0
              ? `${((1 - currentPrice / allTimeHigh) * 100).toFixed(1)}% below`
              : undefined
          }
        />
      </Grid>
      </Stack>
    </Paper>
  );
}

function MiniStat({ label, value, valueClass, note }: { label: string; value: string; valueClass?: string; note?: string }) {
  return (
    <Grid size={{ xs: 6, sm: 4, lg: note ? 4 : 2 }}>
      <Box
        sx={{
          height: '100%',
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, fontFamily: 'monospace', fontWeight: 700 }} className={valueClass}>
          {value}
        </Typography>
        {note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {note}
          </Typography>
        )}
      </Box>
    </Grid>
  );
}
