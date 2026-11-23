import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { AiAnswerCard } from './components/AiAnswerCard';
import { BangsModal } from './components/BangsModal';
import { InfoboxPanel } from './components/InfoboxPanel';
import { InstantToolCard } from './components/InstantToolCard';
import { LiveMonochromeCanvas } from './components/LiveMonochromeCanvas';
import { PreferencesDrawer } from './components/PreferencesDrawer';
import { ResultsList } from './components/ResultsList';
import { SearchLanding } from './components/SearchLanding';
import { SerpHeader } from './components/SerpHeader';
import { TopBar } from './components/TopBar';
import type {
  BookmarkItem,
  FollowUpMessage,
  FreshnessFilter,
  HistoryEntry,
  InstantToolResult,
  RegionCode,
  SafeSearchLevel,
  SearchResponse,
  SearchResultItem,
  SearchTab,
  UserPreferences,
} from './types/search';
import { evaluateInstantTool, parseBangQuery } from './utils/instantTools';

const PREFS_STORAGE_KEY = 'axiom_search_preferences_v1';
const BOOKMARKS_STORAGE_KEY = 'axiom_search_bookmarks_v1';
const HISTORY_STORAGE_KEY = 'axiom_search_history_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  motionMode: 'full',
  safeSearch: 'moderate',
  defaultRegion: 'all',
  autoAiAnswer: true,
  saveHistory: true,
};

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...loadJsonStorage<Partial<UserPreferences>>(PREFS_STORAGE_KEY, {}),
  }));
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    loadJsonStorage<BookmarkItem[]>(BOOKMARKS_STORAGE_KEY, [])
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadJsonStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  );

  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [region, setRegion] = useState<RegionCode>(() => preferences.defaultRegion);
  const [freshness, setFreshness] = useState<FreshnessFilter>('any');
  const [safeSearch, setSafeSearch] = useState<SafeSearchLevel>(() => preferences.safeSearch);
  const [showAiAnswer, setShowAiAnswer] = useState<boolean>(() => preferences.autoAiAnswer);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [instantTool, setInstantTool] = useState<InstantToolResult | null>(null);

  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);

  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [isBangsOpen, setIsBangsOpen] = useState(false);

  // Apply Tailwind dark class cleanly on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota errors
    }
  }, [preferences]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  const executeSearch = useCallback(
    async (
      rawQuery: string,
      options?: {
        tab?: SearchTab;
        region?: RegionCode;
        freshness?: FreshnessFilter;
        safeSearch?: SafeSearchLevel;
        skipUrlPush?: boolean;
      }
    ) => {
      const trimmedRaw = rawQuery.trim();
      if (!trimmedRaw) return;

      const { cleanQuery, bang } = parseBangQuery(trimmedRaw);
      const effectiveText = cleanQuery || trimmedRaw;
      const targetTab: SearchTab = options?.tab ?? bang?.targetTab ?? activeTab;
      const targetRegion = options?.region ?? region;
      const targetFreshness = options?.freshness ?? freshness;
      const targetSafeSearch = options?.safeSearch ?? safeSearch;

      if (!cleanQuery && bang && !bang.siteFilter) {
        // User entered only a tab-switching bang like "!news"
        setActiveTab(targetTab);
        return;
      }

      setQueryInput(trimmedRaw);
      setActiveQuery(effectiveText);
      setActiveTab(targetTab);
      setErrorMessage(null);
      setFollowUps([]);
      setHighlightedCitation(null);

      // Instant deterministic calculator / unit / color / clock check
      const localTool = evaluateInstantTool(effectiveText);
      setInstantTool(localTool);

      // Update browser URL cleanly
      if (!options?.skipUrlPush && typeof window !== 'undefined') {
        const params = new URLSearchParams();
        params.set('q', trimmedRaw);
        if (targetTab !== 'all') params.set('tab', targetTab);
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ q: trimmedRaw, tab: targetTab }, '', nextUrl);
      }

      // Save to local history if enabled
      if (preferences.saveHistory) {
        setHistory((prev) => {
          const filtered = prev.filter(
            (h) => h.query.toLowerCase() !== trimmedRaw.toLowerCase()
          );
          return [
            {
              id: `hist-${Date.now()}`,
              query: trimmedRaw,
              tab: targetTab,
              timestamp: new Date().toISOString(),
            },
            ...filtered,
          ].slice(0, 30);
        });
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: effectiveText,
            tab: targetTab,
            region: targetRegion,
            freshness: targetFreshness,
            safeSearch: targetSafeSearch,
            siteFilter: bang?.siteFilter,
            bangTrigger: bang?.trigger,
            bangLabel: bang?.label,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Search request failed.');
        }

        setSearchResult(data as SearchResponse);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to reach live search backend.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, freshness, preferences.saveHistory, region, safeSearch]
  );

  // Sync URL query params on initial mount and browser back/forward
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const tabParam = params.get('tab') as SearchTab | null;
      const validTab: SearchTab =
        tabParam && ['all', 'images', 'news', 'videos', 'discussions'].includes(tabParam)
          ? tabParam
          : 'all';

      if (q && q.trim()) {
        void executeSearch(q, { tab: validTab, skipUrlPush: true });
      } else {
        setActiveQuery('');
        setSearchResult(null);
        setInstantTool(null);
        setErrorMessage(null);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoHome = () => {
    setActiveQuery('');
    setQueryInput('');
    setSearchResult(null);
    setInstantTool(null);
    setErrorMessage(null);
    setFollowUps([]);
    setActiveTab('all');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handleTabChange = (nextTab: SearchTab) => {
    setActiveTab(nextTab);
    if (activeQuery) {
      void executeSearch(queryInput || activeQuery, { tab: nextTab });
    }
  };

  const handleRegionChange = (nextRegion: RegionCode) => {
    setRegion(nextRegion);
    if (activeQuery) {
      void executeSearch(queryInput || activeQuery, { region: nextRegion });
    }
  };

  const handleFreshnessChange = (nextFreshness: FreshnessFilter) => {
    setFreshness(nextFreshness);
    if (activeQuery) {
      void executeSearch(queryInput || activeQuery, { freshness: nextFreshness });
    }
  };

  const handleSafeSearchChange = (nextLevel: SafeSearchLevel) => {
    setSafeSearch(nextLevel);
    if (activeQuery) {
      void executeSearch(queryInput || activeQuery, { safeSearch: nextLevel });
    }
  };

  const handleFollowUp = async (question: string) => {
    if (!searchResult || isFollowingUp) return;
    const userMsg: FollowUpMessage = {
      id: `fu-u-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setFollowUps((prev) => [...prev, userMsg]);
    setIsFollowingUp(true);

    try {
      const res = await fetch('/api/search/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: searchResult.query,
          answerContext: searchResult.aiSummary,
          followUpQuery: question,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Follow-up failed.');
      }

      const assistantMsg: FollowUpMessage = {
        id: `fu-a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      };
      setFollowUps((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: FollowUpMessage = {
        id: `fu-e-${Date.now()}`,
        role: 'assistant',
        content:
          err instanceof Error
            ? `Unable to answer follow-up: ${err.message}`
            : 'Unable to answer follow-up.',
      };
      setFollowUps((prev) => [...prev, errMsg]);
    } finally {
      setIsFollowingUp(false);
    }
  };

  const handleCiteClick = (index: number) => {
    setHighlightedCitation(index);
    const el = document.getElementById(`source-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleToggleBookmark = (item: SearchResultItem) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === item.url);
      if (exists) {
        return prev.filter((b) => b.url !== item.url);
      }
      return [
        {
          id: item.id,
          title: item.title,
          url: item.url,
          domain: item.domain,
          snippet: item.snippet,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const handleUpdatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      if (patch.safeSearch) setSafeSearch(patch.safeSearch);
      if (patch.defaultRegion) setRegion(patch.defaultRegion);
      if (typeof patch.autoAiAnswer === 'boolean') setShowAiAnswer(patch.autoAiAnswer);
      return next;
    });
  };

  const hasActiveSearch = Boolean(activeQuery);

  return (
    <div className="relative min-h-screen flex flex-col bg-white text-neutral-950 dark:bg-black dark:text-neutral-50 transition-colors duration-200">
      <LiveMonochromeCanvas theme={preferences.theme} motionMode={preferences.motionMode} />

      <TopBar
        activeTab={activeTab}
        hasActiveSearch={hasActiveSearch}
        onGoHome={handleGoHome}
        onSelectTab={handleTabChange}
        onOpenBangs={() => setIsBangsOpen(true)}
        onOpenPreferences={() => setIsPrefsOpen(true)}
      />

      {!hasActiveSearch ? (
        <SearchLanding
          query={queryInput}
          onQueryChange={setQueryInput}
          onSearch={(override) => void executeSearch(override ?? queryInput)}
          history={history}
          onRemoveHistoryItem={(id) =>
            setHistory((prev) => prev.filter((h) => h.id !== id))
          }
          isLoading={isLoading}
        />
      ) : (
        <>
          <SerpHeader
            query={queryInput}
            onQueryChange={setQueryInput}
            onSearch={(override) => void executeSearch(override ?? queryInput)}
            history={history}
            onRemoveHistoryItem={(id) =>
              setHistory((prev) => prev.filter((h) => h.id !== id))
            }
            isLoading={isLoading}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            region={region}
            onRegionChange={handleRegionChange}
            freshness={freshness}
            onFreshnessChange={handleFreshnessChange}
            safeSearch={safeSearch}
            onSafeSearchChange={handleSafeSearchChange}
            showAiAnswer={showAiAnswer}
            onToggleAiAnswer={() => setShowAiAnswer((prev) => !prev)}
            searchTimeMs={searchResult?.searchTimeMs}
          />

          <main className="relative z-10 flex-1 w-full">
            <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-7">
              {/* Active Bang Banner */}
              {searchResult?.bangApplied && !isLoading && (
                <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 dark:border-white/12 bg-neutral-50/80 dark:bg-white/[0.03] px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <span>
                    Scoped with{' '}
                    <span className="font-mono font-semibold text-neutral-950 dark:text-white">
                      {searchResult.bangApplied.trigger}
                    </span>{' '}
                    ({searchResult.bangApplied.label}
                    {searchResult.bangApplied.siteFilter
                      ? ` · ${searchResult.bangApplied.siteFilter}`
                      : ''}
                    )
                  </span>
                  <button
                    type="button"
                    onClick={() => void executeSearch(searchResult.query)}
                    className="underline underline-offset-2 hover:text-neutral-950 dark:hover:text-white"
                  >
                    Search entire web
                  </button>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50/80 dark:bg-red-950/30 p-4 text-sm text-red-900 dark:text-red-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void executeSearch(queryInput || activeQuery)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black text-xs font-medium shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Primary Left Column */}
                <div className="lg:col-span-8 min-w-0">
                  {instantTool && <InstantToolCard tool={instantTool} />}

                  {isLoading ? (
                    <div className="space-y-6" aria-label="Loading search results">
                      {showAiAnswer && activeTab === 'all' && (
                        <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 p-5 space-y-3 animate-pulse">
                          <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-3.5 w-11/12 rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-3.5 w-4/5 rounded bg-neutral-200 dark:bg-white/10" />
                        </div>
                      )}
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="space-y-2 py-2 animate-pulse">
                          <div className="h-3 w-48 rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-white/10" />
                          <div className="h-3.5 w-5/6 rounded bg-neutral-200 dark:bg-white/10" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    searchResult && (
                      <>
                        {showAiAnswer && activeTab === 'all' && searchResult.aiSummary && (
                          <AiAnswerCard
                            query={searchResult.query}
                            summary={searchResult.aiSummary}
                            sources={searchResult.sources}
                            followUps={followUps}
                            isFollowingUp={isFollowingUp}
                            onFollowUp={(q) => void handleFollowUp(q)}
                            onCiteClick={handleCiteClick}
                          />
                        )}

                        <ResultsList
                          tab={activeTab}
                          results={searchResult.results}
                          discussions={searchResult.discussions}
                          relatedQueries={searchResult.relatedQueries}
                          highlightedCitation={highlightedCitation}
                          bookmarks={bookmarks}
                          onToggleBookmark={handleToggleBookmark}
                          onSelectRelatedQuery={(rq) => void executeSearch(rq)}
                        />
                      </>
                    )
                  )}
                </div>

                {/* Right Sidebar: Knowledge Infobox */}
                <div className="lg:col-span-4 space-y-6">
                  {isLoading ? (
                    <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 p-5 space-y-3 animate-pulse">
                      <div className="h-6 w-2/3 rounded bg-neutral-200 dark:bg-white/10" />
                      <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
                      <div className="h-16 w-full rounded bg-neutral-200 dark:bg-white/10" />
                    </div>
                  ) : (
                    searchResult?.infobox && <InfoboxPanel infobox={searchResult.infobox} />
                  )}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      <footer className="relative z-10 border-t border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-500">
          <span>Axiom Search · Live web search with cited AI answers</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsBangsOpen(true)}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Bang Shortcuts
            </button>
            <button
              type="button"
              onClick={() => setIsPrefsOpen(true)}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Privacy & Preferences
            </button>
          </div>
        </div>
      </footer>

      <PreferencesDrawer
        isOpen={isPrefsOpen}
        onClose={() => setIsPrefsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        bookmarks={bookmarks}
        onRemoveBookmark={(url) =>
          setBookmarks((prev) => prev.filter((b) => b.url !== url))
        }
        history={history}
        onSelectHistoryQuery={(q) => void executeSearch(q)}
        onClearHistory={() => setHistory([])}
      />

      <BangsModal
        isOpen={isBangsOpen}
        onClose={() => setIsBangsOpen(false)}
        onTryBang={(example) => void executeSearch(example)}
      />
    </div>
  );
}
