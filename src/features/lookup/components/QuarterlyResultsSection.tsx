import { useMemo, useState } from 'react';
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme } from '@mui/material';
import type {
  QuarterlyConsolidatedRawPeriod,
  QuarterlyPeriod,
  QuarterlyRawMetric,
  QuarterlyResults,
  QuarterlyResultsRaw,
} from '../../../types/analysisExtras';
import { fmtEps, fmtFinancialAmount } from '../../../lib/format';
import { isIndianSymbol } from '../../../lib/nseSymbol';

type AmountKey = 'revenue' | 'pretaxIncome' | 'netIncomeCommon';
type MetricKind = 'amount' | 'eps';
type ComparisonMode = 'qoq' | 'yoy';

const AMOUNT_METRICS: { key: AmountKey; label: string }[] = [
  { key: 'revenue', label: 'Total Revenue' },
  { key: 'pretaxIncome', label: 'Pretax Income' },
  { key: 'netIncomeCommon', label: 'Net Income' },
];

const CONSOLIDATED_RAW_ROWS: {
  key: keyof QuarterlyConsolidatedRawPeriod;
  kind: MetricKind;
  label: string;
}[] = [
  { key: 'quarterlyTotalRevenue', kind: 'amount', label: 'Total Revenue' },
  { key: 'quarterlyPretaxIncome', kind: 'amount', label: 'Pretax Income' },
  { key: 'quarterlyNetIncomeCommonStockholders', kind: 'amount', label: 'Net Income' },
  { key: 'quarterlyBasicEPS', kind: 'eps', label: 'Basic EPS' },
];

/** Most recent first (left), oldest last (right). */
function sortRecentToOldest(periods: QuarterlyPeriod[]): QuarterlyPeriod[] {
  return [...periods].sort((a, b) => b.endDate.localeCompare(a.endDate));
}

function cellClass(
  value: number | null,
  compare: number | null,
  isFirstDataCol: boolean,
  mode: 'light' | 'dark',
): string | undefined {
  if (!isFirstDataCol || value == null || compare == null) return undefined;
  if (value > compare) return mode === 'dark' ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.12)';
  if (value < compare) return mode === 'dark' ? 'rgba(239,68,68,0.16)' : 'rgba(239,68,68,0.1)';
  return undefined;
}

function comparisonIndex(mode: ComparisonMode, count: number): number | null {
  if (mode === 'qoq') return count > 1 ? 1 : null;
  return count > 4 ? 4 : null;
}

function comparisonLabel(mode: ComparisonMode): string {
  return mode === 'qoq' ? 'QoQ' : 'YoY';
}

function comparisonHelp(mode: ComparisonMode): string {
  return mode === 'qoq'
    ? 'First column vs previous quarter'
    : 'First column vs same quarter last year';
}

function fmtMetric(
  key: AmountKey | 'basicEps',
  value: number | null,
  indian: boolean,
): string {
  if (key === 'basicEps') return fmtEps(value, indian);
  return fmtFinancialAmount(value, indian);
}

function rawMetricToNumber(value: QuarterlyRawMetric | undefined): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value && typeof value === 'object') {
    const raw = value.raw;
    if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  }
  return null;
}

function rawMetricCell(
  metric: QuarterlyRawMetric | undefined,
  kind: MetricKind,
  indian: boolean,
): { formatted: string; numeric: number | null } {
  const numeric = rawMetricToNumber(metric);
  const formatted = kind === 'eps' ? fmtEps(numeric, indian) : fmtFinancialAmount(numeric, indian);
  return { formatted, numeric };
}

export function QuarterlyResultsSection({
  symbol,
  data,
  rawData,
}: {
  symbol: string;
  data: QuarterlyResults;
  rawData?: QuarterlyResultsRaw;
}) {
  const theme = useTheme();
  const indian = isIndianSymbol(symbol);
  const periods = useMemo(() => sortRecentToOldest(data.periods), [data.periods]);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('qoq');

  if (periods.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          Quarterly results
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Quarterly results unavailable for this symbol.
        </Typography>
      </Paper>
    );
  }

  const rawPeriods = rawData?.consolidated?.periods ?? [];
  const useRawTable = rawPeriods.length > 0;
  const selectedRawRows = CONSOLIDATED_RAW_ROWS;

  const visibleRawRows = useRawTable
    ? selectedRawRows.filter(({ key }) => rawPeriods.some((p) => p[key] != null))
    : [];

  if (useRawTable) {
    const compareIdx = comparisonIndex(comparisonMode, rawPeriods.length);
    return (
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.75}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
            Quarterly results
          </Typography>
          <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={comparisonMode}
              onChange={(_, value: ComparisonMode | null) => value && setComparisonMode(value)}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 0.25,
                border: '1px solid',
                borderColor: 'divider',
                '& .MuiToggleButton-root': {
                  border: 0,
                  borderRadius: 1,
                  px: 1.25,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                },
              }}
            >
              <ToggleButton value="qoq">QoQ</ToggleButton>
              <ToggleButton value="yoy">YoY</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" title={comparisonHelp(comparisonMode)}>
              Consolidated · {comparisonLabel(comparisonMode)}
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ overflowX: 'auto', mx: -0.5, px: 0.5 }}>
          <Box component="table" sx={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box component="th" sx={{ textAlign: 'left', py: 1.25, pr: 1.5, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
                  Metric
                </Box>
                {rawPeriods.map((p, i) => (
                  <Box
                    component="th"
                    key={p.endDate}
                    sx={{
                      textAlign: 'right',
                      py: 1.25,
                      px: 1,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      color: i === compareIdx ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {p.label}
                    {i === compareIdx && (
                      <Typography component="span" sx={{ display: 'block', mt: 0.25, fontSize: 10, fontWeight: 400, textTransform: 'none', color: 'text.secondary' }}>
                        (compare)
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </thead>
            <tbody>
              {visibleRawRows.map(({ key, kind, label }) => {
                const compareMetric = compareIdx == null
                  ? undefined
                  : (rawPeriods[compareIdx]?.[key] as QuarterlyRawMetric | undefined);
                const compareNumeric = rawMetricToNumber(compareMetric);
                return (
                  <Box component="tr" key={String(key)} sx={{ borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.65), '&:last-child': { borderBottom: 0 } }}>
                    <Box component="td" title={String(key)} sx={{ py: 1.25, pr: 1.5, fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                      {label}
                    </Box>
                    {rawPeriods.map((p, i) => {
                      const metric = p[key] as QuarterlyRawMetric | undefined;
                      const cell = rawMetricCell(metric, kind, indian);
                      return (
                        <Box
                          component="td"
                          key={`${p.endDate}-${String(key)}`}
                          sx={{
                            py: 1,
                            px: 1,
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            bgcolor: cellClass(cell.numeric, compareNumeric, i === 0, theme.palette.mode),
                          }}
                        >
                          {cell.formatted}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </tbody>
          </Box>
        </Box>
        </Stack>
      </Paper>
    );
  }

  const compareIdx = comparisonIndex(comparisonMode, periods.length);

  const rows: { key: AmountKey | 'basicEps'; label: string }[] = [
    ...AMOUNT_METRICS,
    { key: 'basicEps', label: 'Basic EPS' },
  ];

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.25 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1.75}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
          Quarterly results
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={comparisonMode}
            onChange={(_, value: ComparisonMode | null) => value && setComparisonMode(value)}
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 0.25,
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiToggleButton-root': {
                border: 0,
                borderRadius: 1,
                px: 1.25,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 12,
              },
            }}
          >
            <ToggleButton value="qoq">QoQ</ToggleButton>
            <ToggleButton value="yoy">YoY</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" title={comparisonHelp(comparisonMode)}>
            {comparisonLabel(comparisonMode)}
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ overflowX: 'auto', mx: -0.5, px: 0.5 }}>
        <Box component="table" sx={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box component="th" sx={{ textAlign: 'left', py: 1.25, pr: 1.5, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
                Metric
              </Box>
              {periods.map((p, i) => (
                <Box
                  component="th"
                  key={p.endDate}
                  sx={{
                    textAlign: 'right',
                    py: 1.25,
                    px: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    color: i === compareIdx ? 'text.primary' : 'text.secondary',
                  }}
                >
                  {p.label}
                  {i === compareIdx && (
                    <Typography component="span" sx={{ display: 'block', mt: 0.25, fontSize: 10, fontWeight: 400, textTransform: 'none', color: 'text.secondary' }}>
                      (compare)
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <Box component="tr" key={key} sx={{ borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.65), '&:last-child': { borderBottom: 0 } }}>
                <Box component="td" sx={{ py: 1.25, pr: 1.5, fontWeight: 600, color: 'text.secondary' }}>{label}</Box>
                {periods.map((p, i) => {
                  const compare = compareIdx == null ? null : periods[compareIdx][key];
                  const val = p[key];
                  return (
                    <Box
                      component="td"
                      key={`${p.endDate}-${key}`}
                      sx={{
                        py: 1.25,
                        px: 1,
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        bgcolor: cellClass(val, compare, i === 0, theme.palette.mode),
                      }}
                    >
                      {fmtMetric(key, val, indian)}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </tbody>
        </Box>
      </Box>
      </Stack>
    </Paper>
  );
}
