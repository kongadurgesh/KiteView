import { LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { PAGE_COPY } from '../../../content/pageCopy';
import type { DvmScores } from '../analysisScores';

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 65 ? 'success' : score >= 40 ? 'warning' : 'error';
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{score}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={score} color={color} sx={{ height: 8, borderRadius: 999, bgcolor: 'action.hover' }} />
    </Stack>
  );
}

export function DvmSection({ dvm }: { dvm: DvmScores }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          DVM scorecard
        </Typography>
        <Typography variant="body2" color="text.secondary">{PAGE_COPY.analysis.dvmNote}</Typography>
      </Stack>
      <ScoreBar label="Durability" score={dvm.durability} />
      <ScoreBar label="Valuation" score={dvm.valuation} />
      <ScoreBar label="Momentum" score={dvm.momentum} />
      </Stack>
    </Paper>
  );
}
