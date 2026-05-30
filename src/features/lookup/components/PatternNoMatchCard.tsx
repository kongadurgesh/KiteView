import { Link as RouterLink } from 'react-router-dom';
import { Link, Paper, Stack, Typography } from '@mui/material';
import { pageToPath } from '../../../app/routes';
import { PAGE_COPY } from '../../../content/pageCopy';

export function PatternNoMatchCard({ symbol }: { symbol: string }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px dashed', borderColor: 'divider' }}>
      <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
        Breakout
      </Typography>
      <Typography variant="body2" color="text.primary">
        {PAGE_COPY.analysis.noPattern} <strong>{symbol}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Use the{' '}
        <Link component={RouterLink} to={pageToPath('screener')} underline="hover" sx={{ fontWeight: 600 }}>
          Screener
        </Link>{' '}
        to scan the market for fresh breakouts.
      </Typography>
      </Stack>
    </Paper>
  );
}
