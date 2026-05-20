import type { AnalysisNewsItem } from '../../../types/analysisExtras';

export function NewsSection({ news }: { news: AnalysisNewsItem[] }) {
  if (news.length === 0) return null;

  return (
    <div className="card p-5">
      <p className="label-caps mb-3">Recent news</p>
      <ul className="space-y-3">
        {news.map((n, i) => (
          <li key={i} className="text-sm border-b border-border/50 dark:border-border-dark/50 pb-3 last:border-0 last:pb-0">
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-primary dark:text-ink-dark-primary hover:text-accent line-clamp-2"
            >
              {n.title}
            </a>
            <p className="text-xs text-ink-muted mt-0.5">
              {[n.publisher, n.publishedAt].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
