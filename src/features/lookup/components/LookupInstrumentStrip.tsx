import { Box, Button, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import { fmtMoney } from '../../../lib/format';
import { AddToWatchlistButton } from '../../watchlist/components/AddToWatchlistButton';

interface LookupInstrumentStripProps {
  stockName: string;
  symbol: string;
  currentPrice: number;
  isLoading: boolean;
  canRescan: boolean;
  onRescan: () => void;
  onCompare: () => void;
  onCopyLink: () => void;
  onOpenYahoo: () => void;
  watchlistThesis?: {
    entryBuyPrice?: number | null;
    patternDate?: string | null;
  };
}

export function LookupInstrumentStrip({
  stockName,
  symbol,
  currentPrice,
  isLoading,
  canRescan,
  onRescan,
  onCompare,
  onCopyLink,
  onOpenYahoo,
  watchlistThesis,
}: LookupInstrumentStripProps) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        p: { xs: 2, sm: 2.25 },
        border: '1px solid',
        borderColor: 'divider',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(160deg, rgba(17,24,39,0.92), rgba(7,12,24,0.9))'
            : 'linear-gradient(160deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.25} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
          >
            Selected
          </Typography>
          <Typography variant="h6" sx={{ mt: 0.75 }} noWrap>
            {isLoading && !stockName ? '…' : stockName || symbol}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', color: 'text.secondary' }}>
            {symbol}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1.5, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {currentPrice > 0 ? fmtMoney(currentPrice, symbol) : isLoading ? '…' : '—'}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          sx={{
            flexShrink: 0,
            '& .MuiButton-root': {
              textTransform: 'none',
              borderRadius: 1,
              fontWeight: 600,
              boxShadow: 'none',
            },
          }}
        >
          <Button
            variant="outlined"
            size="small"
            disabled={!canRescan}
            onClick={onRescan}
            sx={{ borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.03) }}
          >
            Rescan
          </Button>
          <Button variant="contained" size="small" disabled={!symbol || isLoading} onClick={onCompare}>
            Compare
          </Button>
          <Button variant="outlined" size="small" type="button" disabled={!symbol} onClick={onCopyLink}>
            Copy link
          </Button>
          <Button variant="outlined" size="small" type="button" disabled={!symbol} onClick={onOpenYahoo}>
            Yahoo
          </Button>
          <AddToWatchlistButton
            symbol={symbol}
            shortName={stockName || symbol}
            thesis={watchlistThesis}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
