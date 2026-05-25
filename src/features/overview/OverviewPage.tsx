import { motion, useReducedMotion } from 'framer-motion';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { PAGE_COPY } from '../../content/pageCopy';

const PREVIEW_ROOT = 'relative h-full w-full min-h-0 overflow-hidden';

function OpenButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-primary text-xs px-3 py-2">
      {label}
    </button>
  );
}

function OverviewCard({
  title,
  blurb,
  action,
  preview,
  className = '',
}: {
  title: string;
  blurb: string;
  action: React.ReactNode;
  preview: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={['card h-full min-h-[220px] flex flex-col p-5', className].join(' ')}>
      <div className="card-muted shrink-0 h-28 p-3 overflow-hidden">{preview}</div>
      <div className="mt-4 flex items-start justify-between gap-3 flex-1">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary">{title}</p>
          <p className="card-blurb mt-1">{blurb}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

function ScreenerPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="ml-auto h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
      </div>
      <div className="absolute left-2 right-2 top-7 space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-12 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
            <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
            <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 160}ms` }} />
          </div>
        ))}
      </div>
      <div className="absolute left-2 right-2 top-7 h-2 rounded bg-blue-500/15 ov-scan" />
    </div>
  );
}

function HeatmapPreview({ animated }: { animated: boolean }) {
  const tiles = [
    { l: '2%', t: '8%', w: '38%', h: '46%', c: 'bg-emerald-500/70' },
    { l: '42%', t: '8%', w: '26%', h: '26%', c: 'bg-rose-500/70' },
    { l: '70%', t: '8%', w: '28%', h: '18%', c: 'bg-gray-400/70' },
    { l: '42%', t: '38%', w: '26%', h: '16%', c: 'bg-emerald-500/55' },
    { l: '70%', t: '28%', w: '28%', h: '26%', c: 'bg-rose-500/55' },
    { l: '2%', t: '56%', w: '22%', h: '40%', c: 'bg-rose-500/65' },
    { l: '26%', t: '56%', w: '32%', h: '18%', c: 'bg-gray-400/65' },
    { l: '26%', t: '76%', w: '18%', h: '20%', c: 'bg-emerald-500/65' },
    { l: '46%', t: '76%', w: '22%', h: '20%', c: 'bg-rose-500/60' },
    { l: '70%', t: '56%', w: '28%', h: '40%', c: 'bg-emerald-500/60' },
  ];

  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute inset-0 rounded-md bg-gray-100 dark:bg-gray-950/60 overflow-hidden">
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`absolute rounded-sm ${t.c} ${animated ? 'ov-heat' : ''}`}
            style={{ left: t.l, top: t.t, width: t.w, height: t.h, animationDelay: `${i * 120}ms` }}
          />
        ))}
        <div className="absolute left-2 bottom-1.5 flex items-center gap-2 text-[9px] text-gray-600 dark:text-gray-300">
          <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-rose-500/70 via-gray-300/70 to-emerald-500/70" />
          <span className="font-semibold">1D / 1W / 1M / 1Y</span>
        </div>
      </div>
    </div>
  );
}

function LookupPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />

      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-6 flex-1 rounded-md bg-gray-100 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 flex items-center px-2">
          <div className="h-2 w-20 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
        </div>
        <div className="h-6 w-12 rounded-md bg-blue-600/90" />
      </div>

      <div className="absolute left-2 right-2 top-10 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '180ms' }} />
          <div className={`ml-auto h-2 w-2 rounded-full ${animated ? 'ov-pulse' : ''} bg-emerald-500`} />
        </div>
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '240ms' }} />
        <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  );
}

function ComparePreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute inset-0 rounded-md bg-gray-100 dark:bg-gray-950/60 overflow-hidden">
        <div className="absolute left-0 right-0 top-2 px-2 flex items-center gap-2">
          <div className="h-2 w-12 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="ml-auto h-2 w-14 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '120ms' }} />
        </div>

        <div className="absolute inset-x-2 top-7 bottom-2">
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-300 dark:border-gray-700" />
          <div className={`absolute left-0 top-0 h-7 w-[50%] rounded-md bg-blue-500/25 ${animated ? 'ov-float' : ''}`} />
          <div className={`absolute right-0 bottom-0 h-8 w-[50%] rounded-md bg-emerald-500/25 ${animated ? 'ov-float2' : ''}`} />
          <div className="absolute left-1 bottom-1 h-0.5 w-14 rounded bg-blue-500/70" />
          <div className="absolute left-1 bottom-2.5 h-0.5 w-10 rounded bg-emerald-500/70" />
          <div className="absolute left-1 bottom-4 h-0.5 w-12 rounded bg-rose-500/60" />
        </div>
      </div>
    </div>
  );
}

function PortfolioPreview({ animated }: { animated: boolean }) {
  const bars = [
    { w: '78%', c: 'bg-blue-500/70' },
    { w: '46%', c: 'bg-emerald-500/70' },
    { w: '32%', c: 'bg-rose-500/60' },
    { w: '24%', c: 'bg-amber-500/60' },
  ];

  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-2 flex items-center gap-2">
        <div className="h-2 w-16 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
        <div className="ml-auto h-2 w-10 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '140ms' }} />
      </div>
      <div className="absolute left-2 right-2 top-8 space-y-1.5">
        {bars.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-8 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 130}ms` }} />
            <div className={`h-2 rounded ${b.c} ${animated ? 'ov-weight' : ''}`} style={{ width: b.w, animationDelay: `${i * 220}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchlistPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-2 right-2 top-3 space-y-2">
        {['BUY', 'WAIT', 'BUY'].map((sig, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${sig === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'}`}>
              {sig}
            </span>
            <div className="h-2 flex-1 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: `${i * 120}ms` }} />
            <span className="text-amber-400 text-[10px]">★</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndicesPreview({ animated }: { animated: boolean }) {
  const chips = [
    { label: 'Nifty', c: 'text-emerald-600' },
    { label: 'USD/INR', c: 'text-gray-600 dark:text-gray-400' },
    { label: 'Gold', c: 'text-amber-600' },
    { label: 'BTC', c: 'text-orange-500' },
  ];
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 overflow-hidden" />
      <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 flex gap-3 px-2 ${animated ? 'ticker-marquee-track' : ''}`} style={animated ? { width: 'max-content' } : undefined}>
        {[...chips, ...chips].map((chip, i) => (
          <span key={i} className={`text-[9px] font-semibold whitespace-nowrap ${chip.c}`}>
            {chip.label} +0.4%
          </span>
        ))}
      </div>
    </div>
  );
}

function AboutPreview({ animated }: { animated: boolean }) {
  return (
    <div className={`${PREVIEW_ROOT} ${animated ? 'ov-anim' : ''}`}>
      <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800" />
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className={`size-9 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0 ${animated ? 'ov-ring' : ''}`} />
        <div className="space-y-1.5 min-w-0">
          <div className="h-2 w-24 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" />
          <div className="h-2 w-32 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '160ms' }} />
        </div>
      </div>
      <div className="absolute left-3 right-3 bottom-3 space-y-1.5">
        <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '220ms' }} />
        <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-gray-800 ov-shimmer" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { goToPage } = useAppNavigation();
  const reduceMotion = useReducedMotion();
  const animated = !reduceMotion;

  const cardTransition = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' as const };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: cardTransition },
  };

  const gridCell = 'h-full min-h-[220px]';

  const cards = PAGE_COPY.toolCards;

  return (
    <PageLayout className="max-w-6xl pb-10" title={PAGE_COPY.overview.title} description={PAGE_COPY.overview.description}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: reduceMotion
            ? {}
            : {
                transition: { staggerChildren: 0.06, delayChildren: 0.03 },
              },
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
      >
        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.screener.title}
            blurb={cards.screener.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('screener')} />}
            preview={<ScreenerPreview animated={animated} />}
            className="lg:col-span-2"
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.heatmap.title}
            blurb={cards.heatmap.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('heatmap')} />}
            preview={<HeatmapPreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.analysis.title}
            blurb={cards.analysis.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('analysis')} />}
            preview={<LookupPreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.compare.title}
            blurb={cards.compare.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('compare')} />}
            preview={<ComparePreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.portfolio.title}
            blurb={cards.portfolio.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('portfolio')} />}
            preview={<PortfolioPreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.watchlist.title}
            blurb={cards.watchlist.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('watchlist')} />}
            preview={<WatchlistPreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.indices.title}
            blurb={cards.indices.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('indices')} />}
            preview={<IndicesPreview animated={animated} />}
          />
        </motion.div>

        <motion.div className={gridCell} variants={item} whileHover={reduceMotion ? undefined : { y: -2 }} transition={cardTransition}>
          <OverviewCard
            title={cards.about.title}
            blurb={cards.about.blurb}
            action={<OpenButton label="Open" onClick={() => goToPage('about')} />}
            preview={<AboutPreview animated={animated} />}
          />
        </motion.div>
      </motion.div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .ov-anim * { animation: none !important; transition: none !important; }
        }

        .ov-shimmer {
          background: linear-gradient(90deg, rgba(229,231,235,.9), rgba(255,255,255,.7), rgba(229,231,235,.9));
          background-size: 200% 100%;
          animation: ovShimmer 1.6s ease-in-out infinite;
        }
        :global(.dark) .ov-shimmer {
          background: linear-gradient(90deg, rgba(31,41,55,.9), rgba(17,24,39,.75), rgba(31,41,55,.9));
          background-size: 200% 100%;
        }
        @keyframes ovShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ov-scan {
          animation: ovScan 2.2s ease-in-out infinite;
        }
        @keyframes ovScan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: .8; }
          50% { transform: translateY(18px); opacity: .45; }
          100% { transform: translateY(36px); opacity: 0; }
        }

        .ov-heat {
          animation: ovHeat 3.6s ease-in-out infinite;
        }
        @keyframes ovHeat {
          0%, 100% { filter: saturate(1) brightness(1); opacity: .85; }
          50% { filter: saturate(1.25) brightness(1.06); opacity: .95; }
        }

        .ov-pulse {
          animation: ovPulse 1.4s ease-in-out infinite;
        }
        @keyframes ovPulse {
          0%, 100% { transform: scale(1); opacity: .9; }
          50% { transform: scale(1.35); opacity: 1; }
        }

        .ov-float {
          animation: ovFloat 3.2s ease-in-out infinite;
        }
        .ov-float2 {
          animation: ovFloat2 3.8s ease-in-out infinite;
        }
        @keyframes ovFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        @keyframes ovFloat2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .ov-weight {
          transform-origin: left center;
          animation: ovWeight 2.8s ease-in-out infinite;
        }
        @keyframes ovWeight {
          0%, 100% { transform: scaleX(1); opacity: .9; }
          50% { transform: scaleX(.92); opacity: 1; }
        }

        .ov-ring {
          position: relative;
          background: radial-gradient(circle at 30% 30%, rgba(59,130,246,.35), transparent 60%),
                      radial-gradient(circle at 70% 70%, rgba(16,185,129,.28), transparent 55%),
                      rgba(229,231,235,.9);
          animation: ovRing 5.5s linear infinite;
        }
        :global(.dark) .ov-ring {
          background: radial-gradient(circle at 30% 30%, rgba(59,130,246,.32), transparent 60%),
                      radial-gradient(circle at 70% 70%, rgba(16,185,129,.22), transparent 55%),
                      rgba(31,41,55,.9);
        }
        @keyframes ovRing {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(25deg); }
        }
      `}</style>
    </PageLayout>
  );
}
