import { Box, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import type { AnalysisProfile } from '../../../types/analysisExtras';
import type { FinancialHighlights } from '../../../types/analysisExtras';
import { fmtPct } from '../../../lib/format';

interface Props {
  profile: AnalysisProfile;
  financials: FinancialHighlights;
}

export function CompanyProfileSection({ profile, financials }: Props) {
  const hasProfile = Boolean(profile.longBusinessSummary || profile.website);
  const hasFin = Object.values(financials).some((v) => v != null);
  if (!hasProfile && !hasFin) return null;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
        Company profile
      </Typography>
      {profile.longBusinessSummary && (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {profile.longBusinessSummary}
        </Typography>
      )}
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
        {profile.website && (
          <Link href={profile.website} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: 12, fontWeight: 600 }}>
            Website
          </Link>
        )}
        {profile.fullTimeEmployees != null && (
          <Typography variant="caption" color="text.secondary">
            {profile.fullTimeEmployees.toLocaleString('en-IN')} employees
          </Typography>
        )}
      </Stack>
      {hasFin && (
        <Grid container spacing={1.25} sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Fin label="Revenue growth" value={fmtPct(financials.revenueGrowth)} />
          <Fin label="Profit margin" value={fmtPct(financials.profitMargins)} />
          <Fin label="Operating margin" value={fmtPct(financials.operatingMargins)} />
          <Fin label="ROE" value={fmtPct(financials.returnOnEquity)} />
          <Fin label="Debt/equity" value={financials.debtToEquity != null ? financials.debtToEquity.toFixed(2) : '—'} />
        </Grid>
      )}
      </Stack>
    </Paper>
  );
}

function Fin({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 6, sm: 4 }}>
      <Box sx={{ height: '100%', px: 1.5, py: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, fontFamily: 'monospace', fontWeight: 700 }}>{value}</Typography>
      </Box>
    </Grid>
  );
}
