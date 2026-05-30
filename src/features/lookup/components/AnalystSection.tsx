import { LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { AnalysisRecommendations } from '../../../types/analysisExtras';

export function AnalystSection({ recs }: { recs: AnalysisRecommendations }) {
  const total = recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell;
  if (total === 0) return null;

  const rows = [
    { label: 'Strong buy', count: recs.strongBuy, color: 'success' as const },
    { label: 'Buy', count: recs.buy, color: 'success' as const },
    { label: 'Hold', count: recs.hold, color: 'inherit' as const },
    { label: 'Sell', count: recs.sell, color: 'error' as const },
    { label: 'Strong sell', count: recs.strongSell, color: 'error' as const },
  ].filter((r) => r.count > 0);

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
        Analyst recommendations
      </Typography>
      <Stack spacing={1.25}>
        {rows.map((r) => (
          <Stack key={r.label} direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ width: 92, flexShrink: 0 }}>
              {r.label}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(r.count / total) * 100}
              color={r.color}
              sx={{ flex: 1, height: 8, borderRadius: 999, bgcolor: 'action.hover' }}
            />
            <Typography variant="body2" sx={{ width: 32, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
              {r.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
      </Stack>
    </Paper>
  );
}
