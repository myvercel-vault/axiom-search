export type SearchTab = 'all' | 'images' | 'news' | 'videos' | 'discussions';

export type RegionCode = 'all' | 'us' | 'gb' | 'my' | 'sg' | 'jp' | 'de';

export type FreshnessFilter = 'any' | 'day' | 'week' | 'month' | 'year';

export type SafeSearchLevel = 'strict' | 'moderate' | 'off';

export type MotionMode = 'full' | 'subtle' | 'off';

export type ThemeMode = 'dark' | 'light';

export interface GroundingSource {
  index: number;
  title: string;
  url: string;
  domain: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  breadcrumb: string;
  snippet: string;
  publishedAt?: string;
  sourceName?: string;
  kind: 'web' | 'news' | 'image' | 'video' | 'discussion';
  citationIndex?: number;
  metaLabel?: string;
}

export interface InfoboxFact {
  label: string;
  value: string;
}

export interface InfoboxData {
  title: string;
  subtitle: string;
  description: string;
  officialUrl?: string;
  facts: InfoboxFact[];
}

export interface DiscussionItem {
  id: string;
  platform: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  meta?: string;
}

export interface SearchResponse {
  query: string;
  effectiveQuery: string;
  tab: SearchTab;
  aiSummary: string;
  sources: GroundingSource[];
  results: SearchResultItem[];
  discussions: DiscussionItem[];
  infobox: InfoboxData | null;
  relatedQueries: string[];
  searchTimeMs: number;
  bangApplied?: {
    trigger: string;
    label: string;
    siteFilter?: string;
  } | null;
}

export interface FollowUpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
}

export interface BangDefinition {
  trigger: string;
  label: string;
  description: string;
  siteFilter?: string;
  targetTab?: SearchTab;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  savedAt: string;
}

export interface HistoryEntry {
  id: string;
  query: string;
  tab: SearchTab;
  timestamp: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  motionMode: MotionMode;
  safeSearch: SafeSearchLevel;
  defaultRegion: RegionCode;
  autoAiAnswer: boolean;
  saveHistory: boolean;
}

export interface InstantToolResult {
  type: 'calculator' | 'converter' | 'color' | 'time';
  title: string;
  inputDisplay: string;
  outputDisplay: string;
  detail?: string;
  colorHex?: string;
}
