import { useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { PatternMatch } from '../../../types';
import type { PatternChartBar } from '../patternChartCandles';
import { PatternCandleChart } from './PatternCandleChart';
import { PAGE_COPY } from '../../../content/pageCopy';
import { fmtNumber } from '../../../lib/format';
import { getTradeSignal } from '../../../lib/tradeSignal';
import { QuantityTable } from '../QuantityTable';

interface Props {
  match: PatternMatch;
  currentPrice: number;
  patternChartBars: PatternChartBar[];
}

export function BullishPatternSection({ match, currentPrice, patternChartBars }: Props) {
  const theme = useTheme();
  const priceDiff = currentPrice - match.buyPrice;
  const priceDiffPct = ((priceDiff / match.buyPrice) * 100).toFixed(2);
  const isAbove = priceDiff >= 0;
  const signal = getTradeSignal(currentPrice, match.buyPrice);
  const [slPct, setSlPct] = useState(10);
  const stopLossPrice = parseFloat((match.buyPrice * (1 - slPct / 100)).toFixed(2));

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.5}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          Breakout
        </Typography>
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
          <Badge label="Signal" highlight={signal === 'BUY'}>
            {signal}
          </Badge>
          <Badge label="Pattern date">{match.candle3.date}</Badge>
        </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.5}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
            Pattern chart
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {PAGE_COPY.analysis.patternChartNote}
          </Typography>
        </Box>
        <PatternCandleChart
          bars={patternChartBars}
          buyPrice={match.buyPrice}
          buyTriggerPrice={match.buyTriggerPrice}
        />
        </Stack>
      </Paper>

      <Stack spacing={1.25}>
        <PriceCard
          label="Buy trigger"
          value={fmtNumber(match.buyTriggerPrice)}
          sub={`0.985 × ${fmtNumber(match.candle3.close)}`}
          accent="amber"
        />
        <PriceCard
          label="Buy price"
          value={fmtNumber(match.buyPrice)}
          sub={`0.98 × ${fmtNumber(match.candle3.close)}`}
          accent="green"
        />
        <Paper
          elevation={0}
          sx={{
            p: 2,
            textAlign: 'center',
            border: '1px solid',
            borderColor: isAbove ? 'success.light' : 'error.light',
            bgcolor: isAbove ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.error.main, 0.08),
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Current price
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.75, fontFamily: 'monospace', fontWeight: 700 }}>
            {fmtNumber(currentPrice)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700, color: isAbove ? 'success.main' : 'error.main' }}>
            {isAbove ? '+' : ''}
            {priceDiffPct}% from buy
          </Typography>
        </Paper>
      </Stack>

      <Paper
        elevation={0}
        sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.error.main, 0.04) }}
      >
        <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Stop loss %
          </Typography>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
            value={slPct}
            onChange={(e) => setSlPct(Number(e.target.value))}
              sx={{ borderRadius: 1 }}
          >
              <MenuItem value={5}>5%</MenuItem>
              <MenuItem value={10}>10%</MenuItem>
              <MenuItem value={15}>15%</MenuItem>
              <MenuItem value={20}>20%</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'error.main' }}>
            Stop loss price
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.5, color: 'error.main', fontWeight: 700, fontFamily: 'monospace' }}>
            {fmtNumber(stopLossPrice)}
          </Typography>
        </Box>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
        <QuantityTable buyPrice={match.buyPrice} />
      </Paper>
    </Stack>
  );
}

function Badge({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Chip
        size="small"
        label={children}
        color={highlight ? 'success' : 'default'}
        variant={highlight ? 'filled' : 'outlined'}
        sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'uppercase' }}
      />
    </Stack>
  );
}

function PriceCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'amber' | 'green';
}) {
  const theme = useTheme();
  const palette = accent === 'amber' ? theme.palette.warning : theme.palette.success;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        textAlign: 'center',
        border: '1px solid',
        borderColor: palette.light,
        bgcolor: alpha(palette.main, 0.08),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: palette.dark }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 700, fontFamily: 'monospace' }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
        {sub}
      </Typography>
    </Paper>
  );
}
