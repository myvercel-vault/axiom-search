import { ArrowUpRight } from 'lucide-react';
import type { HistoryEntry } from '../types/search';
import { SearchBox } from './SearchBox';

interface SearchLandingProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSearch: (queryOverride?: string) => void;
  history: HistoryEntry[];
  onRemoveHistoryItem: (id: string) => void;
  isLoading: boolean;
}

const STARTER_QUERIES = [
  'Vercel next generation web infrastructure',
  'How Brave Search independent indexing works',
  'Latest quantum computing breakthroughs',
  '125 km to miles',
];

const QUICK_BANGS = [
  { trigger: '!w', label: 'Wikipedia' },
  { trigger: '!gh', label: 'GitHub' },
  { trigger: '!yt', label: 'YouTube' },
  { trigger: '!rd', label: 'Reddit' },
  { trigger: '!so', label: 'Stack Overflow' },
];

export function SearchLanding({
  query,
  onQueryChange,
  onSearch,
  history,
  onRemoveHistoryItem,
  isLoading,
}: SearchLandingProps) {
  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
      <div className="w-full max-w-[700px] flex flex-col items-center text-center">
        <h1 className="font-display text-4xl sm:text-5xl md:text-[54px] font-bold tracking-tight text-neutral-950 dark:text-white leading-[1.08] text-balance">
          Search the open web, privately.
        </h1>

        <p className="mt-4 max-w-xl text-base sm:text-[17px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Live web results, cited AI summaries, category filters, and instant utility tools in a
          focused monochrome workspace.
        </p>

        <div className="mt-9 w-full">
          <SearchBox
            value={query}
            onChange={onQueryChange}
            onSubmit={onSearch}
            history={history}
            onRemoveHistoryItem={onRemoveHistoryItem}
            size="hero"
            isLoading={isLoading}
            autoFocus
          />
        </div>

        {/* Interactive Bang Shortcut Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-500 mr-1">Quick bangs:</span>
          {QUICK_BANGS.map((item) => (
            <button
              key={item.trigger}
              type="button"
              onClick={() => onQueryChange(`${item.trigger} `)}
              className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40 hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span className="font-mono font-semibold mr-1.5">{item.trigger}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Clean Unboxed Starter Searches */}
        <div className="mt-12 w-full border-t border-neutral-200/80 dark:border-white/10 pt-6">
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-500 mb-3">
            Try a live search
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            {STARTER_QUERIES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  onQueryChange(sample);
                  onSearch(sample);
                }}
                className="group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-neutral-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] hover:border-neutral-900 dark:hover:border-white/35 transition-colors text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
              >
                <span className="truncate">{sample}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
