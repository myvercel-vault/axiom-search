# Axiom Search

Axiom Search is a full-stack, privacy-first live web search engine that combines Brave Search's complete search workflow with a Vercel-inspired monochrome aesthetic, live animated background canvas, and interactive touch/pointer ripple effects. Every query executes real-time web grounding through a server-side search API to deliver cited AI answers, categorized web results, discussions, infoboxes, and instant tools in an English-only interface.

### User Review & Critical Decisions

> [!IMPORTANT]
> All core product, aesthetic, and feature choices from your clarifying answers are locked into this plan below. Review the architecture and confirm **Proceed** to begin building.

- **Confirmed Decision 1 — Search Scope**: Live web search powered by real-time web grounding, returning clickable external source links alongside a cited AI answer summary.
- **Confirmed Decision 2 — Visual Aesthetic & Motion**: Vercel-inspired high-contrast black-and-white monochrome design (`#000000` canvas, crisp 1px hairlines, pure `#FFFFFF` action accents) featuring a live 60fps animated architectural grid/particle canvas wallpaper and cursor/touch-reactive ripple and border-spotlight effects.
- **Confirmed Decision 3 — Brave Search Feature Parity**: Full Brave Search experience including `All`, `Images`, `News`, `Videos`, and `Discussions` tabs, filter controls (`Region`, `Freshness`, `SafeSearch`), expandable `Answer with AI` card with inline citations and follow-up chat, entity `Infobox`, `!bangs` shortcuts, instant calculator/unit tools, search history, and bookmarks.
- **Confirmed Decision 4 — Language**: 100% English user interface.

### 1. Overview & Core Concept

- **What It Does**: Users enter any web query on a minimal monochrome landing page or persistent search header to receive real-time web results, a collapsible AI-synthesized overview with verifiable source citations, a structured entity infobox, community discussions, and instant utility answers.
- **Target Audience / Persona**: Everyday web searchers, developers, and researchers who want Brave Search's speed, filtering precision, `!bangs`, and AI answers inside an ultra-clean monochrome workspace.
- **Key Value**: Combines live web discovery, zero-account local privacy controls (client-side history and bookmarks), and high-craft interactive visual polish without visual clutter or ad trackers.

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Landing & Instant Discovery**: Opens to a full-viewport obsidian canvas with a subtle animated architectural perspective grid and drifting monochrome particles. Typing in the centered search bar reveals instant suggestions, recent searches, and `!bang` shortcuts; pressing anywhere emits a crisp monochrome touch/click ripple.
  2. **All Results & AI Answer**: Submitting a query transitions smoothly to the two-column search results layout—an expandable **Answer with AI** panel at the top with numbered source citations `[1]`, `[2]`, followed by clean organic web results, a **Discussions** block, and **Related Searches**, paired with a right-hand **Infobox** panel when an entity is detected.
  3. **In-Context Follow-Up**: Inside the AI Answer panel, users can type follow-up questions to refine or explore the topic while keeping the original web sources attached.
  4. **Category Tabs & Filtering**: Switching between `All`, `Images`, `News`, `Videos`, and `Discussions` or adjusting `Region`, `Freshness`, and `SafeSearch` triggers fresh scoped queries and tailored result layouts.
  5. **Preferences & Local Library**: Clicking `Preferences` opens a slide-over drawer to manage saved bookmarks, view or clear local search history, toggle Vercel Dark / Clean Light theme, adjust wallpaper motion intensity, and set default SafeSearch/AI Answer behavior.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Monochrome architectural precision inspired by `vercel.com`—stark contrast, razor-thin borders, generous breathing room, and tactile pointer responsiveness.
  - *Color Palette & Mood*:
    - `--background`: `#000000` (primary obsidian canvas) / `#FFFFFF` (optional light mode toggle)
    - `--surface`: `#0A0A0A` & `#111111` structural surfaces with `rgba(255, 255, 255, 0.10)` hairline borders
    - `--primary`: `#FFFFFF` high-contrast foreground and primary action fill (`#000000` text inside primary buttons)
    - `--muted`: `#A1A1AA` secondary snippets and `#71717A` unboxed URL breadcrumbs and metadata
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for sharp geometric display titles and brand wordmark, `DM Sans` for highly legible 15px result snippets and AI prose, and `JetBrains Mono` (`tabular-nums`) for URL paths, timestamps, `!bang` commands, and instant calculator readouts.
  - *Component Styling & Layout*: Strict 3-zone top bar (`Axiom` wordmark — single-line navigation links — `Preferences` button), unboxed inline metadata separated by `·` and `›`, single-level card elevation (`1px` border without nested card boxes), and a wide `1200px` SERP container matching `1440px` desktop ergonomics.

- **Interactive Feedback & Motion**:
  - **Live Animated Wallpaper**: HTML5 Canvas background rendering an undulating Vercel-style perspective grid and subtle starfield nodes that softly illuminate toward the active pointer/touch coordinates (automatically honoring `prefers-reduced-motion` and user motion preferences).
  - **Touch & Pointer Effects**: Pointer-down / touch-start events spawn fading concentric monochrome ripples, while interactive result items and the search bar feature a subtle cursor-tracking border spotlight.
  - **Fast State Transitions**: Sub-200ms hover and tab transitions, structured skeleton loaders during live search fetches, and clear empty/error states with one-click retry.

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Live Web Grounding via Server-Side Gemini API**:
  - *Chosen Approach*: Route all search queries through an Express backend endpoint calling `gemini-4-hydrogen` with Google Search grounding enabled, extracting real `groundingChunks` web URLs and titles alongside structured result blocks.
  - *Why*: Delivers genuine, up-to-date web citations and synthesized AI summaries without requiring fragile third-party scraping keys or exposing any API credentials to the browser.
  - *Alternatives Considered*: Static mock search index (rejected because the user requested live web search with real sources) or client-side API calls (rejected for security and key protection).

- **Decision 2 — Client-Side Privacy Storage (`localStorage`)**:
  - *Chosen Approach*: Persist search history, saved bookmarks, SafeSearch defaults, theme choice, and wallpaper motion settings locally in the browser rather than requiring user sign-in or a remote database.
  - *Why*: Mirrors Brave Search's zero-tracking, instant-access philosophy—users can search immediately, toggle history off, or wipe all local data in one click.
  - *Alternatives Considered*: Account-gated cloud database (unnecessary friction for a personal search engine).

- **Decision 3 — Deterministic Client-Side Instant Tools & `!Bangs`**:
  - *Chosen Approach*: Evaluate arithmetic expressions, unit conversions, hex/RGB color inspections, and `!bang` prefixes (`!w`, `!gh`, `!yt`, `!rd`, `!npm`, `!so`, `!news`, `!img`) immediately on the client before/alongside web search.
  - *Why*: Zero-latency instant answers for common utility queries and power-user keyboard workflows, matching Brave Search's signature responsiveness.

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          Browser Client (React)                         │
│                                                                         │
│  ┌─────────────────────────┐   ┌─────────────────────────────────────┐  │
│  │ Live Wallpaper & Touch  │   │ Top Bar · Search Hero · SERP View   │  │
│  │ Canvas (Grid + Ripples) │   │ (Tabs, Filters, AI Answer, Results) │  │
│  └─────────────────────────┘   └──────────────────┬──────────────────┘  │
│                                                   │                     │
│  ┌─────────────────────────┐   ┌──────────────────▼──────────────────┐  │
│  │ Instant Tools & !Bangs  │   │ Local Privacy Store (localStorage)  │  │
│  │ (Math, Units, Shortcuts)│   │ (History, Bookmarks, Theme, Motion) │  │
│  └─────────────────────────┘   └──────────────────┬──────────────────┘  │
└───────────────────────────────────────────────────┼─────────────────────┘
                                                    │ HTTPS JSON (/api/*)
┌───────────────────────────────────────────────────▼─────────────────────┐
│                        Express Server (Port 3000)                       │
│                                                                         │
│  ┌──────────────────────────────┐   ┌────────────────────────────────┐  │
│  │ Input Validation & URL Guard │──▶│ Gemini Search Grounding Proxy  │  │
│  │ (Query Bounds, Tab/Filter)   │   │ (gemini-4-hydrogen + Search)   │  │
│  └──────────────────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Search Request**: Query string, active category tab (`all`, `images`, `news`, `videos`, `discussions`), region code, freshness window, SafeSearch level, and optional `!bang` scope.
  - **Search Response**: Grounded AI summary text with inline citation markers, verified source list (`title`, `url`, `domain`, `snippet`, `publishedAt`, `kind`), optional entity `infobox` (`title`, `subtitle`, `description`, `facts[]`, `officialUrl`), community `discussions[]`, and `relatedQueries[]`.
  - **Local Preferences & Library**: Saved bookmarks array, recent search history array (capped and toggleable), theme mode (`dark` / `light`), wallpaper motion mode (`full` / `subtle` / `off`), and default filter settings.

- **Interactive Component & State Mapping**:
  - **Search Input & Autocomplete**: Keyboard `/` shortcut focuses input; typing filters recent history, matching `!bangs`, and instant suggestions; `Enter` or submit triggers `POST /api/search`.
  - **Category Tabs & Filter Bar**: Changing tabs or `Region` / `Freshness` / `SafeSearch` updates URL query state and re-fetches scoped grounded results while preserving the AI Answer context when applicable.
  - **AI Answer & Follow-Up**: Supports expand/collapse, one-click copy, clickable citation chips that highlight/scroll to the matching source card, and an inline follow-up input calling `POST /api/search/followup`.
  - **Security Safeguards**: `GEMINI_API_KEY` remains strictly server-side via environment variables; all backend endpoints validate query lengths and filter enums; all external URLs from search results are checked to permit only `http:` and `https:` protocols before rendering clickable links via safe framework bindings.

