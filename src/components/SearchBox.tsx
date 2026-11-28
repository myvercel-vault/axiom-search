import { useState } from 'react';
import { Clock3, LoaderCircle, Search, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { HistoryEntry } from '../types/search';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (queryOverride?: string) => void;
  history: HistoryEntry[];
  onRemoveHistoryItem: (id: string) => void;
  size: 'hero' | 'compact';
  isLoading: boolean;
  autoFocus?: boolean;
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  history,
  onRemoveHistoryItem,
  size,
  isLoading,
  autoFocus = false,
}: SearchBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isHero = size === 'hero';
  const matchingHistory = history
    .filter((entry) => entry.query.toLowerCase().includes(value.trim().toLowerCase()))
    .slice(0, 5);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoading && value.trim()) {
      setIsFocused(false);
      onSubmit(value);
    }
  };

  return (
    <form className="relative w-full" role="search" onSubmit={handleSubmit}>
      <div
        className={`flex w-full items-center gap-3 rounded-xl border bg-white dark:bg-neutral-950 transition-colors ${
          isHero ? 'px-4 py-3.5' : 'px-3 py-2'
        } ${
          isFocused
            ? 'border-neutral-400 dark:border-white/30'
            : 'border-neutral-200 dark:border-white/15'
        }`}
      >
        <Search className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsFocused(false);
          }}
          autoFocus={autoFocus}
          aria-label="Search the web"
          aria-autocomplete="list"
          aria-expanded={isFocused && matchingHistory.length > 0}
          placeholder="Search the web..."
          className={`min-w-0 flex-1 bg-transparent text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-white ${
            isHero ? 'text-base' : 'text-sm'
          }`}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          aria-label={isLoading ? 'Searching' : 'Search'}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neutral-950 font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200 ${
            isHero ? 'px-4 py-2 text-sm' : 'h-8 w-8'
          }`}
        >
          {isLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          {isHero && <span>{isLoading ? 'Searching' : 'Search'}</span>}
        </button>
      </div>

      {isFocused && matchingHistory.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-neutral-950">
          <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Recent searches
          </div>
          {matchingHistory.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(entry.query);
                  setIsFocused(false);
                  onSubmit(entry.query);
                }}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-neutral-700 dark:text-neutral-200"
              >
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
                <span className="truncate">{entry.query}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${entry.query} from search history`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onRemoveHistoryItem(entry.id)}
                className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:text-neutral-900 focus:opacity-100 group-hover:opacity-100 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
