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
    <div className="card p-5 space-y-4">
      <p className="label-caps">Company profile</p>
      {profile.longBusinessSummary && (
        <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary leading-relaxed line-clamp-6">
          {profile.longBusinessSummary}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Website
          </a>
        )}
        {profile.fullTimeEmployees != null && (
          <span>{profile.fullTimeEmployees.toLocaleString('en-IN')} employees</span>
        )}
      </div>
      {hasFin && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border dark:border-border-dark">
          <Fin label="Revenue growth" value={fmtPct(financials.revenueGrowth)} />
          <Fin label="Profit margin" value={fmtPct(financials.profitMargins)} />
          <Fin label="Operating margin" value={fmtPct(financials.operatingMargins)} />
          <Fin label="ROE" value={fmtPct(financials.returnOnEquity)} />
          <Fin label="Debt/equity" value={financials.debtToEquity != null ? financials.debtToEquity.toFixed(2) : '—'} />
        </div>
      )}
    </div>
  );
}

function Fin({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-muted px-3 py-2 rounded-lg">
      <p className="text-[10px] uppercase text-ink-muted">{label}</p>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}
