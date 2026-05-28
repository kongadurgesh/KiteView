import { useCallback, useEffect, useState } from 'react';
import { useAppNavigation } from '../../app/navigation';
import { PageLayout } from '../../components/layout/PageLayout';
import { SectionHeader } from '../../components/ui';
import { PAGE_COPY } from '../../content/pageCopy';
import {
  ALL_INDICES,
  INDEX_CATEGORIES,
  indicesByCategory,
  type IndexCategory,
} from '../../data/indicesCatalog';
import {
  heatmapIndexIdFor,
  indexCategoryOpensHeatmap,
} from '../../data/indexHeatmapLinks';
import { fmtQuotePct } from '../../lib/format';
import {
  fetchIndexQuotes,
  formatIndexChange,
  formatIndexPrice,
  INDEX_QUOTE_REFRESH_MS,
  type IndexQuote,
} from '../../services/indexQuotes';

function IndexFlag({ code }: { code: string }) {
  const iso = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w20/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 2x`}
      alt=""
      width={20}
      height={15}
      className="absolute top-3 right-3 w-5 h-[15px] object-cover rounded-[2px] ring-1 ring-black/10 dark:ring-white/15"
      loading="lazy"
      decoding="async"
    />
  );
}

function IndexCard({
  q,
  onOpenHeatmap,
}: {
  q: IndexQuote;
  onOpenHeatmap?: () => void;
}) {
  const isUp = (q.change ?? 0) >= 0;
  const hasData = q.price != null;
  const clickable = onOpenHeatmap != null;
  const flagCode = q.instrument.flagCode;

  const content = (
    <>
      {flagCode && <IndexFlag code={flagCode} />}
      <p className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary truncate pr-7">
        {q.instrument.label}
      </p>
      <p className="text-lg font-mono font-semibold text-ink-primary dark:text-ink-dark-primary">
        {hasData ? formatIndexPrice(q) : '—'}
      </p>
      {hasData ? (
        <p
          className={`text-xs font-mono font-medium ${
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatIndexChange(q)} ({fmtQuotePct(q.changePct)})
        </p>
      ) : (
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Unavailable</p>
      )}
      {clickable && (
        <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-1">
          View heatmap →
        </p>
      )}
    </>
  );

  const cardClass =
    'card relative p-4 flex flex-col gap-2 min-h-[100px]';

  if (!clickable) {
    return <div className={cardClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpenHeatmap}
      className={`${cardClass} text-left w-full transition-colors hover:border-accent/40 dark:hover:border-accent/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-surface-dark`}
      title={`Open ${q.instrument.label} in Market Heatmap`}
    >
      {content}
    </button>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="card p-4 flex flex-col gap-2 min-h-[100px] animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function CategorySection({
  category,
  title,
  quotes,
  loading,
  sectionHint,
  onOpenHeatmap,
}: {
  category: IndexCategory;
  title: string;
  quotes: IndexQuote[];
  loading: boolean;
  sectionHint?: string;
  onOpenHeatmap?: (heatmapIndexId: string) => void;
}) {
  const items = indicesByCategory(category);
  const quoteMap = new Map(quotes.map((q) => [q.instrument.id, q]));
  const heatmapCategory = indexCategoryOpensHeatmap(category);

  return (
    <section className="space-y-3">
      <SectionHeader title={title} />
      {sectionHint && (
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted -mt-1">{sectionHint}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {loading
          ? items.map((i) => <IndexCardSkeleton key={i.id} />)
          : items.map((instrument) => {
              const heatmapId = heatmapCategory ? heatmapIndexIdFor(instrument) : null;
              return (
                <IndexCard
                  key={instrument.id}
                  q={
                    quoteMap.get(instrument.id) ?? {
                      instrument,
                      price: null,
                      change: null,
                      changePct: null,
                    }
                  }
                  onOpenHeatmap={
                    heatmapId && onOpenHeatmap ? () => onOpenHeatmap(heatmapId) : undefined
                  }
                />
              );
            })}
      </div>
    </section>
  );
}

export function IndicesPage() {
  const { viewHeatmapIndex } = useAppNavigation();
  const [quotes, setQuotes] = useState<IndexQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await fetchIndexQuotes(ALL_INDICES);
    setQuotes(results);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), INDEX_QUOTE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const openHeatmap = useCallback(
    (heatmapIndexId: string) => {
      viewHeatmapIndex(heatmapIndexId);
    },
    [viewHeatmapIndex],
  );

  return (
    <PageLayout
      className="max-w-7xl mt-6"
      title={PAGE_COPY.indices.title}
      description={PAGE_COPY.indices.description}
    >
      <div className="space-y-8">
        {lastRefresh && (
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted -mt-2">
            Last updated {lastRefresh.toLocaleTimeString()} · refreshes every 15s
          </p>
        )}

        {INDEX_CATEGORIES.map(({ id, title }) => (
          <CategorySection
            key={id}
            category={id}
            title={title}
            quotes={quotes}
            loading={loading}
            onOpenHeatmap={id === 'indian' || id === 'global' ? openHeatmap : undefined}
            sectionHint={
              id === 'indian'
                ? PAGE_COPY.indices.indianHeatmapHint
                : id === 'global'
                  ? PAGE_COPY.indices.globalHeatmapHint
                  : undefined
            }
          />
        ))}
      </div>
    </PageLayout>
  );
}
