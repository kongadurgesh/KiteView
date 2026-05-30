import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import type { TechnicalSummary } from '../technicalUtils';
import { PriceChart1Y } from './PriceChart1Y';

interface Props {
  technical: TechnicalSummary;
  priceSeries: { date: string; close: number }[];
}

export function TechnicalSection({ technical, priceSeries }: Props) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
        Technicals
      </Typography>
      <Grid container spacing={1.25}>
        <Stat label="Trend" value={technical.trendLabel} />
        <Stat
          label="vs 52W high"
          value={technical.pctFrom52WeekHigh != null ? `${technical.pctFrom52WeekHigh.toFixed(1)}%` : '—'}
        />
        <Stat
          label="vs 52W low"
          value={technical.pctFrom52WeekLow != null ? `+${technical.pctFrom52WeekLow.toFixed(1)}%` : '—'}
        />
        <Stat
          label="Range position"
          value={technical.rangePositionPct != null ? `${technical.rangePositionPct.toFixed(0)}%` : '—'}
        />
        <Stat label="50-day SMA" value={technical.sma50 != null ? technical.sma50.toFixed(2) : '—'} />
        <Stat
          label="Above SMA50"
          value={technical.aboveSma50 == null ? '—' : technical.aboveSma50 ? 'Yes' : 'No'}
        />
        <Stat label="RSI (14)" value={technical.rsi14 != null ? technical.rsi14.toFixed(1) : '—'} />
      </Grid>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          1-year price
        </Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'action.hover', px: 1, pt: 0.5 }}>
        <PriceChart1Y data={priceSeries} />
        </Box>
      </Box>
      </Stack>
    </Paper>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 6, sm: 4, lg: 3 }}>
      <Box sx={{ height: '100%', px: 1.5, py: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{value}</Typography>
      </Box>
    </Grid>
  );
}
