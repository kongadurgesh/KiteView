import { Link, Paper, Stack, Typography } from '@mui/material';
import type { AnalysisNewsItem } from '../../../types/analysisExtras';

export function NewsSection({ news }: { news: AnalysisNewsItem[] }) {
  if (news.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1.5}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
        Recent news
      </Typography>
      <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {news.map((n, i) => (
          <Stack
            key={i}
            component="li"
            spacing={0.5}
            sx={{ pb: 1.5, borderBottom: i === news.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}
          >
            <Link
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              color="text.primary"
              sx={{ fontSize: 14, fontWeight: 600 }}
            >
              {n.title}
            </Link>
            <Typography variant="caption" color="text.secondary">
              {[n.publisher, n.publishedAt].filter(Boolean).join(' · ')}
            </Typography>
          </Stack>
        ))}
      </Stack>
      </Stack>
    </Paper>
  );
}
