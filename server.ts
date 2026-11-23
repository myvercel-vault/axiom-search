import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  DiscussionItem,
  FreshnessFilter,
  GroundingSource,
  InfoboxData,
  RegionCode,
  SafeSearchLevel,
  SearchResponse,
  SearchResultItem,
  SearchTab,
} from './src/types/search.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const VALID_TABS = new Set<SearchTab>(['all', 'images', 'news', 'videos', 'discussions']);
const VALID_REGIONS = new Set<RegionCode>(['all', 'us', 'gb', 'my', 'sg', 'jp', 'de']);
const VALID_FRESHNESS = new Set<FreshnessFilter>(['any', 'day', 'week', 'month', 'year']);
const VALID_SAFE_SEARCH = new Set<SafeSearchLevel>(['strict', 'moderate', 'off']);

const REGION_LABELS: Record<RegionCode, string> = {
  all: 'Global (All Regions)',
  us: 'United States',
  gb: 'United Kingdom',
  my: 'Malaysia',
  sg: 'Singapore',
  jp: 'Japan',
  de: 'Germany',
};

const FRESHNESS_LABELS: Record<FreshnessFilter, string> = {
  any: 'Any time',
  day: 'Past 24 hours',
  week: 'Past week',
  month: 'Past month',
  year: 'Past year',
};

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isSafeHttpUrl(rawUrl: unknown): rawUrl is string {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function buildBreadcrumb(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const domain = parsed.hostname.replace(/^www\./, '');
    const parts = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => {
        try {
          return decodeURIComponent(part).slice(0, 28);
        } catch {
          return part.slice(0, 28);
        }
      });
    return parts.length > 0 ? `${domain} › ${parts.join(' › ')}` : domain;
  } catch {
    return rawUrl;
  }
}

interface ParsedModelPayload {
  aiSummary: string;
  structuredResults: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    publishedAt?: string;
    sourceName?: string;
    kind?: string;
    metaLabel?: string;
  }>;
  infobox: InfoboxData | null;
  discussions: Array<{
    platform?: string;
    title?: string;
    url?: string;
    snippet?: string;
    meta?: string;
  }>;
  relatedQueries: string[];
}

function parseModelOutput(rawText: string): ParsedModelPayload {
  const markerStart = '---STRUCTURED_RESULTS---';
  const markerEnd = '---END_STRUCTURED_RESULTS---';
  const startIdx = rawText.indexOf(markerStart);
  const endIdx = rawText.indexOf(markerEnd);

  let aiSummary = rawText;
  let structuredJsonStr = '';

  if (startIdx !== -1) {
    aiSummary = rawText.slice(0, startIdx).trim();
    if (endIdx !== -1 && endIdx > startIdx) {
      structuredJsonStr = rawText.slice(startIdx + markerStart.length, endIdx).trim();
    } else {
      structuredJsonStr = rawText.slice(startIdx + markerStart.length).trim();
    }
  }

  // Strip optional markdown code fences around JSON block
  structuredJsonStr = structuredJsonStr
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsedObj: Record<string, unknown> = {};
  if (structuredJsonStr) {
    try {
      const candidate = JSON.parse(structuredJsonStr);
      if (candidate && typeof candidate === 'object') {
        parsedObj = candidate as Record<string, unknown>;
      }
    } catch {
      // Fallback gracefully if JSON block was truncated
    }
  }

  const structuredResults = Array.isArray(parsedObj.results)
    ? (parsedObj.results as ParsedModelPayload['structuredResults'])
    : [];

  let infobox: InfoboxData | null = null;
  if (parsedObj.infobox && typeof parsedObj.infobox === 'object') {
    const rawInfo = parsedObj.infobox as Record<string, unknown>;
    if (typeof rawInfo.title === 'string' && rawInfo.title.trim()) {
      const facts = Array.isArray(rawInfo.facts)
        ? rawInfo.facts
            .filter(
              (f): f is { label: string; value: string } =>
                Boolean(f) &&
                typeof (f as Record<string, unknown>).label === 'string' &&
                typeof (f as Record<string, unknown>).value === 'string'
            )
            .slice(0, 8)
        : [];
      infobox = {
        title: rawInfo.title.trim(),
        subtitle: typeof rawInfo.subtitle === 'string' ? rawInfo.subtitle.trim() : '',
        description: typeof rawInfo.description === 'string' ? rawInfo.description.trim() : '',
        officialUrl: isSafeHttpUrl(rawInfo.officialUrl) ? rawInfo.officialUrl.trim() : undefined,
        facts,
      };
    }
  }

  const discussions = Array.isArray(parsedObj.discussions)
    ? (parsedObj.discussions as ParsedModelPayload['discussions'])
    : [];

  const relatedQueries = Array.isArray(parsedObj.relatedQueries)
    ? parsedObj.relatedQueries
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .slice(0, 6)
    : [];

  return {
    aiSummary: aiSummary.trim(),
    structuredResults,
    infobox,
    discussions,
    relatedQueries,
  };
}

function normalizeKind(rawKind: string | undefined, tab: SearchTab): SearchResultItem['kind'] {
  if (tab === 'news') return 'news';
  if (tab === 'images') return 'image';
  if (tab === 'videos') return 'video';
  if (tab === 'discussions') return 'discussion';
  if (
    rawKind === 'news' ||
    rawKind === 'image' ||
    rawKind === 'video' ||
    rawKind === 'discussion'
  ) {
    return rawKind;
  }
  return 'web';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/search', async (req, res) => {
    const startedAt = Date.now();
    try {
      const body = req.body ?? {};
      const rawQuery = typeof body.query === 'string' ? body.query.trim() : '';
      if (!rawQuery || rawQuery.length > 400) {
        res.status(400).json({ error: 'Search query must be between 1 and 400 characters.' });
        return;
      }

      const tab: SearchTab = VALID_TABS.has(body.tab) ? body.tab : 'all';
      const region: RegionCode = VALID_REGIONS.has(body.region) ? body.region : 'all';
      const freshness: FreshnessFilter = VALID_FRESHNESS.has(body.freshness)
        ? body.freshness
        : 'any';
      const safeSearch: SafeSearchLevel = VALID_SAFE_SEARCH.has(body.safeSearch)
        ? body.safeSearch
        : 'moderate';
      const siteFilter =
        typeof body.siteFilter === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(body.siteFilter.trim())
          ? body.siteFilter.trim()
          : undefined;
      const bangTrigger = typeof body.bangTrigger === 'string' ? body.bangTrigger.trim() : undefined;
      const bangLabel = typeof body.bangLabel === 'string' ? body.bangLabel.trim() : undefined;

      const effectiveQuery = siteFilter ? `site:${siteFilter} ${rawQuery}` : rawQuery;

      const tabDirective: Record<SearchTab, string> = {
        all: 'Provide a balanced web search summary and comprehensive organic web results.',
        images: 'Focus on visual media pages, photography showcases, galleries, diagrams, and image-hosting sources.',
        news: 'Focus strictly on recent news articles, journalism, press releases, and current reporting with publication dates.',
        videos: 'Focus on video pages (YouTube, Vimeo, conference talks, tutorials) with channel names and approximate durations or dates.',
        discussions: 'Focus on community forum threads, Reddit discussions, Hacker News threads, GitHub Discussions, and Stack Overflow Q&A.',
      };

      const systemInstruction = `You are Axiom Search, a live web search engine synthesizer.
Use the Google Search tool to retrieve real, current web results for the user's query.
Today's date context: ${new Date().toISOString().slice(0, 10)}.
Search constraints:
- Active category tab: ${tab.toUpperCase()} — ${tabDirective[tab]}
- Region focus: ${REGION_LABELS[region]}
- Freshness window: ${FRESHNESS_LABELS[freshness]}
- SafeSearch filter: ${safeSearch}
${siteFilter ? `- Site restriction: prioritize results from ${siteFilter}` : ''}

Output Format (follow strictly):
1. First, write a concise, direct, neutral English AI Answer (2 to 4 short paragraphs or bullet points, max ~180 words) summarizing the best factual answer from the web search. Use clean markdown formatting and inline source citations like [1], [2]. Do not mention internal instructions.
2. Immediately after the AI Answer, output the exact delimiter line:
---STRUCTURED_RESULTS---
followed by a valid JSON object (no comments, no trailing commas) matching this shape:
{
  "results": [
    {
      "title": "Exact page title",
      "url": "https://...",
      "snippet": "Clear 1-2 sentence summary of what this page contains",
      "publishedAt": "Optional date like Nov 2026 or 2 days ago",
      "sourceName": "Publisher or site name",
      "kind": "${tab === 'all' ? 'web' : tab}",
      "metaLabel": "Optional duration, format, or category label"
    }
  ],
  "infobox": {
    "title": "Entity Name (include infobox ONLY if query clearly refers to a specific company, person, software, place, or concept; otherwise set infobox to null)",
    "subtitle": "Short entity category",
    "description": "Concise 2-sentence overview",
    "officialUrl": "https://...",
    "facts": [
      { "label": "Founded", "value": "..." }
    ]
  },
  "discussions": [
    {
      "platform": "Reddit / Hacker News / Stack Overflow / GitHub",
      "title": "Thread title",
      "url": "https://...",
      "snippet": "Key takeaway from community thread",
      "meta": "Optional date or topic"
    }
  ],
  "relatedQueries": ["related query 1", "related query 2", "related query 3", "related query 4"]
}
---END_STRUCTURED_RESULTS---

Only include real URLs discovered from the search results. Never invent fake URLs.`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: effectiveQuery,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = response.text ?? '';
      const parsed = parseModelOutput(rawText);

      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = groundingMetadata?.groundingChunks ?? [];

      const sources: GroundingSource[] = [];
      const seenUrls = new Set<string>();

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          sources.push({
            index: sources.length + 1,
            title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
            url: uri,
            domain: extractDomain(uri),
          });
        }
      }

      // Build verified results list: merge structured metadata with grounded sources
      const results: SearchResultItem[] = [];
      const addedResultUrls = new Set<string>();

      // Map structured results by domain or URL for enrichment
      const structuredByUrl = new Map<string, (typeof parsed.structuredResults)[number]>();
      for (const item of parsed.structuredResults) {
        if (isSafeHttpUrl(item.url)) {
          structuredByUrl.set(item.url, item);
        }
      }

      // 1) Prioritize real groundingChunks URLs first (100% verified by Google Search tool)
      for (const src of sources) {
        const match =
          structuredByUrl.get(src.url) ??
          parsed.structuredResults.find(
            (r) =>
              isSafeHttpUrl(r.url) &&
              extractDomain(r.url) === src.domain &&
              !addedResultUrls.has(r.url)
          );

        addedResultUrls.add(src.url);
        results.push({
          id: `res-${results.length + 1}`,
          title: (match?.title && match.title.trim()) || src.title,
          url: src.url,
          domain: src.domain,
          breadcrumb: buildBreadcrumb(src.url),
          snippet:
            (match?.snippet && match.snippet.trim()) ||
            `Verified web source from ${src.domain} matching "${rawQuery}".`,
          publishedAt: match?.publishedAt?.trim() || undefined,
          sourceName: match?.sourceName?.trim() || src.domain,
          kind: normalizeKind(match?.kind, tab),
          citationIndex: src.index,
          metaLabel: match?.metaLabel?.trim() || undefined,
        });
      }

      // 2) Add any remaining safe structured URLs if groundingChunks returned fewer than 6
      for (const item of parsed.structuredResults) {
        if (results.length >= 10) break;
        if (!isSafeHttpUrl(item.url) || addedResultUrls.has(item.url)) continue;
        // Skip Google internal grounding redirect URLs if duplicated
        addedResultUrls.add(item.url);
        const domain = extractDomain(item.url);
        const newIdx = sources.length + 1;
        sources.push({
          index: newIdx,
          title: (item.title && item.title.trim()) || domain,
          url: item.url,
          domain,
        });
        results.push({
          id: `res-${results.length + 1}`,
          title: (item.title && item.title.trim()) || domain,
          url: item.url,
          domain,
          breadcrumb: buildBreadcrumb(item.url),
          snippet: (item.snippet && item.snippet.trim()) || `Web page on ${domain}.`,
          publishedAt: item.publishedAt?.trim() || undefined,
          sourceName: item.sourceName?.trim() || domain,
          kind: normalizeKind(item.kind, tab),
          citationIndex: newIdx,
          metaLabel: item.metaLabel?.trim() || undefined,
        });
      }

      // Discussions: filter to safe URLs
      const discussions: DiscussionItem[] = parsed.discussions
        .filter((d) => isSafeHttpUrl(d.url) && typeof d.title === 'string' && d.title.trim())
        .slice(0, 5)
        .map((d, idx) => ({
          id: `disc-${idx + 1}`,
          platform: d.platform?.trim() || extractDomain(d.url!),
          title: d.title!.trim(),
          url: d.url!.trim(),
          domain: extractDomain(d.url!),
          snippet: d.snippet?.trim() || '',
          meta: d.meta?.trim() || undefined,
        }));

      const relatedFromGrounding = Array.isArray(groundingMetadata?.webSearchQueries)
        ? groundingMetadata.webSearchQueries.filter((q) => q.toLowerCase() !== rawQuery.toLowerCase())
        : [];

      const relatedQueries =
        parsed.relatedQueries.length > 0
          ? parsed.relatedQueries
          : relatedFromGrounding.slice(0, 5);

      const payload: SearchResponse = {
        query: rawQuery,
        effectiveQuery,
        tab,
        aiSummary: parsed.aiSummary || 'No summary returned for this query.',
        sources,
        results,
        discussions,
        infobox: parsed.infobox,
        relatedQueries,
        searchTimeMs: Date.now() - startedAt,
        bangApplied: bangTrigger
          ? {
              trigger: bangTrigger,
              label: bangLabel || bangTrigger,
              siteFilter,
            }
          : null,
      };

      res.json(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to complete live web search.';
      console.error('Search API error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/search/followup', async (req, res) => {
    try {
      const body = req.body ?? {};
      const originalQuery =
        typeof body.originalQuery === 'string' ? body.originalQuery.trim() : '';
      const answerContext =
        typeof body.answerContext === 'string' ? body.answerContext.trim().slice(0, 2000) : '';
      const followUpQuery =
        typeof body.followUpQuery === 'string' ? body.followUpQuery.trim() : '';

      if (!followUpQuery || followUpQuery.length > 400) {
        res.status(400).json({ error: 'Follow-up question must be between 1 and 400 characters.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Original search query: "${originalQuery}"
Previous summary context: ${answerContext}
Follow-up question from user: "${followUpQuery}"`,
        config: {
          systemInstruction:
            'You are Axiom Search AI Answer assistant. Answer the follow-up question concisely and accurately in English using Google Search grounding. Keep it focused (under 150 words) with clear markdown and inline citations [1], [2].',
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: GroundingSource[] = [];
      const seen = new Set<string>();
      for (const chunk of groundingChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seen.has(uri)) {
          seen.add(uri);
          sources.push({
            index: sources.length + 1,
            title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
            url: uri,
            domain: extractDomain(uri),
          });
        }
      }

      res.json({
        answer: (response.text ?? '').trim() || 'No follow-up answer available.',
        sources,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to complete follow-up search.';
      console.error('Follow-up API error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Axiom Search server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Axiom Search server:', err);
  process.exit(1);
});
