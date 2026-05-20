import type { DvmScores } from '../analysisScores';

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 65 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-ink-primary dark:text-ink-dark-primary">{label}</span>
        <span className="font-mono font-semibold">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted dark:bg-surface-dark-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function DvmSection({ dvm }: { dvm: DvmScores }) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <p className="label-caps">DVM scorecard</p>
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-1">
          Rule-based Durability, Valuation, Momentum (0–100)
        </p>
      </div>
      <ScoreBar label="Durability" score={dvm.durability} />
      <ScoreBar label="Valuation" score={dvm.valuation} />
      <ScoreBar label="Momentum" score={dvm.momentum} />
    </div>
  );
}
