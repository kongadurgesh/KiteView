import {
  alpha,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { PageLayout } from '../../components/layout/PageLayout';
import { PAGE_COPY } from '../../content/pageCopy';
import { SectionHeader } from '../../components/ui';

const TRACK_RECORD = [
  { fy: '2021-22', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/1P04wvDCzSVS0UxyIZTOGnMohoJtiGZoE/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'sheet' as const },
  { fy: '2022-23', status: 'Net Positive', proofLabel: 'View P&L (Groww)', url: 'https://docs.google.com/spreadsheets/d/11cD9ttg6tS1e0Bjl51lpwiIxhB3TGecW/edit?usp=sharing&ouid=111406837300351215866&rtpof=true&sd=true', type: 'sheet' as const },
  { fy: '2023-24', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/ab143f05-371f-40a6-97b0-deafbedf312c.html', type: 'verified' as const },
  { fy: '2024-25', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/53edf16c-39a4-490a-83ee-809d22ff5498.html', type: 'verified' as const },
  { fy: '2025-26', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/83ba31c7-8a4f-4436-a94a-8d141acab9b7.html', type: 'verified' as const },
  { fy: '2026-27', status: 'Net Positive', proofLabel: 'FYERS Verified P&L', url: 'https://verifiedpnldocs.fyers.in/VerifiedPNL/htmls/1d748036-e2bc-4d1a-be83-94bf9bb6012f.html', type: 'verified' as const },
];

const { about: copy } = PAGE_COPY;

export function AboutPage() {
  const theme = useTheme();

  return (
    <PageLayout className="max-w-7xl mt-6">
      <Stack spacing={2.25} sx={{ position: 'relative', isolation: 'isolate' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: { xs: 240, md: 320 },
            height: { xs: 240, md: 320 },
            borderRadius: '50%',
            top: -100,
            left: -100,
            filter: 'blur(38px)',
            opacity: 0.34,
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(14,165,233,0.14) 55%, transparent 72%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: { xs: 260, md: 340 },
            height: { xs: 260, md: 340 },
            borderRadius: '50%',
            bottom: -120,
            right: -80,
            filter: 'blur(42px)',
            opacity: 0.24,
            background: 'radial-gradient(circle, rgba(245,158,11,0.24) 0%, rgba(99,102,241,0.12) 58%, transparent 76%)',
          }}
        />

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            minHeight: { xs: 190, md: 176 },
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
            position: 'relative',
            background:
              'radial-gradient(1200px 180px at 0% -10%, rgba(16,185,129,0.15), transparent 50%), radial-gradient(800px 180px at 100% 120%, rgba(14,165,233,0.12), transparent 55%)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.5,
              pointerEvents: 'none',
              background:
                'linear-gradient(120deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.03) 70%)',
              transform: 'translateX(-40%)',
              animation: 'ovHeroSweep 6s ease-in-out infinite',
            }}
          />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ minHeight: '100%' }}>
            <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
              <Box
                sx={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'common.white',
                  fontWeight: 800,
                  fontSize: 24,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
                  boxShadow: '0 8px 22px rgba(14,165,233,0.25)',
                }}
              >
                DK
              </Box>
              <Box>
                <Typography variant="h5" sx={{ mb: 0.75 }}>{copy.title}</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{copy.identityName}</Typography>
                <Typography variant="body2" color="text.secondary">{copy.identityTagline}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: 'wrap', rowGap: 1 }}>
                  <Chip size="small" label="Transparent Track Record" color="success" variant="outlined" />
                  <Chip size="small" label="Verified P&L" color="primary" variant="outlined" />
                  <Chip size="small" label="Research First" color="warning" variant="outlined" />
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
          }}
        >
          <SectionHeader title={copy.philosophyTitle} />
          <Typography variant="body1" sx={{ mt: 1.25, lineHeight: 1.75 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              {copy.philosophyQuote}
            </Box>{' '}
            {copy.philosophyBody}
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
          }}
        >
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.5 }, pb: 1 }}>
            <SectionHeader title={copy.trackRecordTitle} />
          </Box>
          <Box sx={{ overflowX: 'auto', px: { xs: 2, sm: 2.5 }, pb: 1.5 }}>
            <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
              <Box component="thead" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="tr">
                  <Box component="th" sx={{ textAlign: 'left', py: 1.25, pr: 1.5, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'text.secondary' }}>
                    Financial Year
                  </Box>
                  <Box component="th" sx={{ textAlign: 'left', py: 1.25, px: 1.5, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'text.secondary' }}>
                    Status
                  </Box>
                  <Box component="th" sx={{ textAlign: 'left', py: 1.25, pl: 1.5, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'text.secondary' }}>
                    Proof
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {TRACK_RECORD.map((row) => (
                  <Box key={row.fy} component="tr" sx={{ borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.65), '&:last-child': { borderBottom: 0 } }}>
                    <Box component="td" sx={{ py: 1.5, pr: 1.5, fontWeight: 700 }}>{row.fy}</Box>
                    <Box component="td" sx={{ py: 1.5, px: 1.5 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>{row.status}</Typography>
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ py: 1.5, pl: 1.5 }}>
                      <Button
                        size="small"
                        variant="text"
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textTransform: 'none', fontWeight: 700, px: 0, minWidth: 0 }}
                        startIcon={row.type === 'verified' ? <VerifiedRoundedIcon sx={{ fontSize: 16 }} /> : undefined}
                        endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                      >
                        {row.proofLabel}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 }, lineHeight: 1.7 }}>
            FY 2021-23 reports are from Groww. FY 2023-24 onwards are FYERS Verified P&L links which are tamper-proof and
            independently verifiable.
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(165deg, rgba(17,24,39,0.9), rgba(3,7,18,0.9))'
                : 'linear-gradient(165deg, rgba(255,255,255,0.96), rgba(248,250,252,0.95))',
          }}
        >
          <SectionHeader title="Get in Touch" />
          <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            <Button size="small" variant="outlined" href="mailto:kongadurgesh20@gmail.com" sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700 }}>
              Email
            </Button>
            <Button size="small" variant="outlined" href="https://linkedin.com/in/durgeshkonga" target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700 }}>
              LinkedIn
            </Button>
            <Button size="small" variant="outlined" href="https://x.com/durgesh_konga" target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700 }}>
              X (Twitter)
            </Button>
          </Stack>
        </Paper>

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
