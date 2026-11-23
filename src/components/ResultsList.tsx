import {
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Play,
  Search,
} from 'lucide-react';
import type {
  BookmarkItem,
  DiscussionItem,
  SearchResultItem,
  SearchTab,
} from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface ResultsListProps {
  tab: SearchTab;
  results: SearchResultItem[];
  discussions: DiscussionItem[];
  relatedQueries: string[];
  highlightedCitation: number | null;
  bookmarks: BookmarkItem[];
  onToggleBookmark: (item: SearchResultItem) => void;
  onSelectRelatedQuery: (q: string) => void;
}

function DomainMonogram({ domain }: { domain: string }) {
  const initial = (domain[0] || 'W').toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 dark:border-white/15 bg-neutral-100 dark:bg-white/10 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 shrink-0"
    >
      {initial}
    </span>
  );
}

export function ResultsList({
  tab,
  results,
  discussions,
  relatedQueries,
  highlightedCitation,
  bookmarks,
  onToggleBookmark,
  onSelectRelatedQuery,
}: ResultsListProps) {
  const bookmarkedUrls = new Set(bookmarks.map((b) => b.url));
  const safeResults = results.filter((r) => isSafeExternalUrl(r.url));
  const safeDiscussions = discussions.filter((d) => isSafeExternalUrl(d.url));

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  if (safeResults.length === 0 && safeDiscussions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-white/15 bg-white/70 dark:bg-neutral-950/70 p-8 text-center">
        <p className="font-display text-base font-semibold text-neutral-950 dark:text-white">
          No web sources matched this filter combination
        </p>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Try widening the Freshness or Region filter, or rephrasing your search terms.
        </p>
      </div>
    );
  }

  // Images Tab: Monochrome Visual Media Source Grid
  if (tab === 'images') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeResults.map((item) => {
            const isBookmarked = bookmarkedUrls.has(item.url);
            return (
              <article
                key={item.id}
                onPointerMove={handlePointerMove}
                className="spotlight-card group flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-white/12 bg-white/80 dark:bg-neutral-950/80 overflow-hidden transition-colors hover:border-neutral-400 dark:hover:border-white/30"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4"
                >
                  <div className="aspect-[16/10] w-full rounded-lg border border-neutral-200/80 dark:border-white/10 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-900 dark:via-black dark:to-neutral-900 flex flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="h-7 w-7 text-neutral-400 dark:text-neutral-500 mb-2" />
                    <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-full">
                      {item.domain}
                    </span>
                    {item.metaLabel && (
                      <span className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        {item.metaLabel}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-sm font-semibold text-neutral-950 dark:text-white group-hover:underline underline-offset-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {item.snippet}
                  </p>
                </a>

                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-neutral-200/70 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="truncate font-mono">{item.domain}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(item)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
                      className={`p-1 rounded transition-colors ${
                        isBookmarked
                          ? 'text-neutral-950 dark:text-white'
                          : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="p-1 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // Discussions Tab
  if (tab === 'discussions') {
    const items = safeDiscussions.length > 0 ? safeDiscussions : safeResults.map((r) => ({
      id: r.id,
      platform: r.sourceName || r.domain,
      title: r.title,
      url: r.url,
      domain: r.domain,
      snippet: r.snippet,
      meta: r.publishedAt,
    }));

    return (
      <div className="space-y-4">
        {items.map((thread) => (
          <article
            key={thread.id}
            onPointerMove={handlePointerMove}
            className="spotlight-card rounded-xl border border-neutral-200 dark:border-white/12 bg-white/80 dark:bg-neutral-950/80 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-neutral-800 dark:text-neutral-200">{thread.platform}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono truncate">{thread.domain}</span>
              {thread.meta && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{thread.meta}</span>
                </>
              )}
            </div>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-display text-base sm:text-[17px] font-semibold text-neutral-950 dark:text-white hover:underline underline-offset-4"
            >
              <span>{thread.title}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400" />
            </a>
            {thread.snippet && (
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {thread.snippet}
              </p>
            )}
          </article>
        ))}
      </div>
    );
  }

  // All, News, and Videos Tabs
  return (
    <div className="space-y-8">
      {/* Organic / News / Video Results */}
      <div className="divide-y divide-neutral-200/80 dark:divide-white/10">
        {safeResults.map((item) => {
          const isBookmarked = bookmarkedUrls.has(item.url);
          const isHighlighted =
            highlightedCitation !== null && item.citationIndex === highlightedCitation;

          return (
            <article
              key={item.id}
              id={item.citationIndex ? `source-${item.citationIndex}` : undefined}
              className={`py-5 first:pt-1 transition-colors duration-200 ${
                isHighlighted
                  ? 'px-4 -mx-4 rounded-xl bg-neutral-100/90 dark:bg-white/[0.06] ring-1 ring-neutral-900/30 dark:ring-white/40'
                  : ''
              }`}
            >
              {/* Source Breadcrumb Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DomainMonogram domain={item.domain} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {item.sourceName || item.domain}
                      </span>
                      {item.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums whitespace-nowrap">{item.publishedAt}</span>
                        </>
                      )}
                      {item.citationIndex && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">[{item.citationIndex}]</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 truncate">
                      {item.breadcrumb}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(item)}
                  aria-label={isBookmarked ? `Remove ${item.title} from bookmarks` : `Bookmark ${item.title}`}
                  className={`p-1.5 rounded-md transition-colors shrink-0 ${
                    isBookmarked
                      ? 'text-neutral-950 dark:text-white'
                      : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Result Title */}
              <div className="mt-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 font-display text-lg font-semibold text-neutral-950 dark:text-white hover:underline underline-offset-4"
                >
                  {tab === 'videos' && (
                    <Play className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  )}
                  <span>{item.title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500" />
                </a>
              </div>

              {/* Snippet */}
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-[68ch]">
                {item.snippet}
              </p>

              {item.metaLabel && (
                <div className="mt-1.5 text-xs font-mono text-neutral-400 dark:text-neutral-500">
                  {item.metaLabel}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Brave-style Discussions Module inside All tab */}
      {tab === 'all' && safeDiscussions.length > 0 && (
        <section
          aria-label="Community discussions"
          className="pt-6 border-t border-neutral-200 dark:border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-display text-base font-semibold text-neutral-950 dark:text-white">
              Discussions & Forums
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {safeDiscussions.slice(0, 4).map((thread) => (
              <a
                key={thread.id}
                href={thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-neutral-200 dark:border-white/12 bg-white/70 dark:bg-neutral-950/70 p-4 hover:border-neutral-900 dark:hover:border-white/35 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>
                    {thread.platform} · <span className="font-mono">{thread.domain}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="mt-1.5 font-display text-sm font-semibold text-neutral-950 dark:text-white group-hover:underline underline-offset-2 line-clamp-2">
                  {thread.title}
                </div>
                {thread.snippet && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {thread.snippet}
                  </p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Related Searches */}
      {relatedQueries.length > 0 && (
        <section
          aria-label="Related searches"
          className="pt-6 border-t border-neutral-200 dark:border-white/10"
        >
          <h3 className="font-display text-sm font-semibold text-neutral-950 dark:text-white mb-3">
            Related Searches
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedQueries.map((rq) => (
              <button
                key={rq}
                type="button"
                onClick={() => onSelectRelatedQuery(rq)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] hover:border-neutral-900 dark:hover:border-white/35 text-left text-sm text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">{rq}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
