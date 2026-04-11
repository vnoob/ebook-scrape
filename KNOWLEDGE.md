# ebook-scape Knowledge Context

> This document serves as the base knowledge for AI models working on this project.
> Updated before each commit to maintain accurate project context.

---

## 1. Project Features

| Feature | Description |
|---------|-------------|
| **Smart Article Discovery** | Automatically finds article links from blog pages, filtering out non-article content (author pages, tags, pagination) |
| **Clean Content Extraction** | Uses Mozilla Readability to extract main article content, stripping ads, sidebars, and navigation |
| **PDF Generation** | Creates professional PDFs with clickable Table of Contents, page numbers, and proper formatting |
| **EPUB Generation** | Generates EPUB files compatible with e-readers (Kindle, iPad, Kobo, etc.) |
| **Performance Optimization** | Request interception blocks unnecessary resources (images, fonts, tracking) for 80% faster scraping |
| **Browser Detection** | Prefers system Chrome/Edge/Chromium/Brave; falls back to **chrome-headless-shell** from `chromium-<platform>-<arch>.zip` beside the executable (SHA256 verified, extracted once to `./chromium/`) |
| **Cross-Platform Executables** | Standalone binaries for Linux, Windows, and macOS via pkg |
| **Anti-Bot Bypass** | Puppeteer stealth plugin to avoid detection on protected sites |
| **AI Layout Mode (PDF v1)** | Optional AI-generated CSS stylesheet for PDF output using metadata-only prompts, with cache + validation + static fallback; prompt includes layout-efficiency guidance to reduce blank space in PDFs |
| **Link stripping (default on)** | Non-anchor hyperlinks are stripped by default (`--no-strip-links` to preserve links); programmatic `extractContent` matches unless `stripLinks: false` |
| **Content filtering (default on)** | After extraction, rule-based filter omits thin/error/login-heavy/duplicate/navigation-heavy pages; with `--ai-api-key` or `EBOOK_SCAPE_*_API_KEY`, uses batched AI smart filter (10 articles/call) with rule fallback per batch; `--no-filter` disables all filtering |
| **Peripheral DOM stripping (pre-Readability)** | Before Readability, `extractor.ts` removes comments, discussions, related/recommended blocks, Disqus/WordPress comment areas, newsletter widgets, ads, and nav/aside/sidebars (selectors from `non-content-selectors.ts`); same pass runs again on extracted HTML for defense in depth |
| **Lazy-load expansion (default on)** | After `page.goto`, `lazy-loader.ts` strips non-content in the live DOM, reveals lazy images (`data-src` → `src`), scrolls viewport-by-viewport with mutation-based stability waits, and may click safe “load more” controls inside `article`/`main`; `--lazy-load-timeout` (default 20s) caps work; `--no-lazy-load` uses legacy scroll + 1s delay only |

---

## 2. Tech Stack

### Runtime & Language
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ (`engines` in package.json; 22 for pkg exe targets) | Runtime environment |
| TypeScript | 5.4.x | Type-safe development |
| ES Modules | ES2022 | Module system |

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| puppeteer-core | ^22.0.0 | Headless browser automation (without bundled Chromium download) |
| puppeteer-extra | ^3.3.6 | Plugin system for Puppeteer |
| puppeteer-extra-plugin-stealth | ^2.11.2 | Anti-detection evasions |
| @mozilla/readability | ^0.5.0 | Content extraction algorithm |
| jsdom | ^24.0.0 | DOM manipulation in Node.js |
| epub-gen-memory | ^1.1.2 | EPUB file generation |
| commander | ^12.0.0 | CLI argument parsing |
| ora | ^5.4.1 | Loading spinners |
| chalk | ^4.1.2 | Terminal colors |
| chrome-paths | ^1.0.1 | Browser path detection |
| p-limit | ^7.3.0 | Concurrency control |
| extract-zip | ^2.0.1 | Extract bundled chrome-headless-shell zip at runtime |
| fetch (Node built-in) | Node 20+ | AI provider REST calls (Gemini/OpenAI/Anthropic) without SDKs |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.4.0 | TypeScript compiler |
| @yao-pkg/pkg | ^6.14.1 | Executable packaging |
| @puppeteer/browsers | ^2.x | Download chrome-headless-shell zips for `npm run download:chromium` |
| ts-node | ^10.9.0 | TypeScript execution |
| vitest | ^3.x | Unit tests (`npm test`) |
| @types/* | various | Type definitions |

---

## 3. Architecture

### Module Structure

```
scripts/
└── download-chromium.mjs  # Fetch chrome-headless-shell zips for pkg releases
src/
├── index.ts                 # CLI entry point (Commander setup)
├── crawler.ts               # Article discovery & URL crawling
├── extractor.ts           # Content extraction with Readability (articles include source `url`)
├── non-content-selectors.ts # Shared peripheral-DOM selector list (JSDOM + live page strip)
├── lazy-loader.ts         # Live-page lazy expansion (strip, images, scroll, load-more)
├── generator.ts             # PDF & EPUB generation (+ optional AI CSS for PDF)
├── ai-layout.ts           # AI prompt building, metadata extraction, CSS validation, caching
├── content-filter.ts      # Rule-based + AI batched smart filtering for non-contributing pages
├── browser-utils.ts       # Browser detection + bundled headless shell extraction
└── chrome-paths.d.ts      # Type definitions for chrome-paths
```

### Data Flow

```
User Input (URL)
      │
      ▼
┌─────────────┐
│  crawler.ts │  ── getArticleLinks() ──► Array<string> (article URLs)
└─────────────┘
      │
      ▼
┌──────────────┐
│ extractor.ts │  ── extractContent() ──► Array<{url, title, contentHTML}>
└──────────────┘
      │
      ▼
┌──────────────┐
│  ai-layout.ts│  ── getAILayout() ──► CSS string (optional, cached)
└──────────────┘
      │
      ▼
┌──────────────────┐
│ content-filter.ts │  ── filterContent() / smartFilterContent() ──► kept articles + omissions (CLI)
└──────────────────┘
      │
      ▼
┌──────────────┐
│ generator.ts │  ── buildPDF(css?) / buildEPUB() ──► Output file
└──────────────┘
```

### Key Design Decisions

1. **Shared Browser Instance**: Single Puppeteer browser instance shared across operations for efficiency
2. **Request Interception**: Block unnecessary resources during discovery phase, allow during extraction
3. **Lazy Loading Support**: `expandLazyContent()` strips peripheral DOM in the browser first, then reveals lazy images, scrolls with stability detection, and optionally clicks safe in-article load-more controls; CLI `--no-lazy-load` restores legacy scroll-only behavior
4. **Graceful Degradation**: Continue processing even if individual articles fail
5. **Local Browser Preference**: Use system browser when available; otherwise verify and extract **chrome-headless-shell** from a sidecar zip next to the executable (or `./build` when developing); never rely on Puppeteer-downloaded Chromium inside the pkg snapshot

### Output Formats

| Format | Library | Features |
|--------|---------|----------|
| PDF | Puppeteer `page.pdf()` | TOC, page numbers, A4 format, clickable links |
| EPUB | epub-gen-memory | Chapters, navigation, reflowable content |

---

## 4. Changelog

### [2026-04-11] - Comprehensive lazy-load expansion (live page)
- **Author**: AI-assisted
- **Changes**: Added `src/lazy-loader.ts` and shared `src/non-content-selectors.ts`; extraction calls `expandLazyContent()` after navigation (default 20s budget) with strip → lazy images → scroll/stability → load-more loop; `NON_CONTENT_SELECTORS` narrows social-share patterns vs legacy `[class*="share"]`; CLI `--lazy-load-timeout` and `--no-lazy-load`; `ExtractionOptions` gains `lazyLoad` / `lazyLoadTimeout` / optional `onProgress`; Vitest + `tests/lazy-loader.test.ts` for pure helpers; docs in README/USAGE.
- **Impact**: `src/extractor.ts`, `src/index.ts`, `package.json`, `README.md`, `USAGE.md`, `KNOWLEDGE.md`, `docs/decisions/DECISIONS.md`, new `src/lazy-loader.ts`, `src/non-content-selectors.ts`, `tests/lazy-loader.test.ts`, `vitest.config.ts`

### [2026-04-11] - Omit peripheral sections from exports (pre-Readability)
- **Author**: AI-assisted
- **Changes**: Call `removeUnwantedElements()` before `Readability.parse()` in `extractSingleUrl()` and `extract()`; expanded selector list for comments (incl. Disqus/WordPress), discussions, related/recommended content, ads, newsletters, and social/share blocks; kept post-extraction pass in `convertRelativeUrlsToAbsolute()`. Documented selector strategy in `docs/decisions/DECISIONS.md` (Peripheral Content Removal).
- **Impact**: `src/extractor.ts`, `KNOWLEDGE.md`, `docs/decisions/DECISIONS.md` (decision entry)

### [2026-04-11] - PDF layout + content filtering (v1.1.0)
- **Author**: AI-assisted
- **Changes**: CLI `1.1.0`: `--no-strip-links` (strip links by default); `--no-filter` to disable post-extraction filtering; `ArticleContent` includes `url`; `content-filter.ts` with heuristics + batched AI smart filter when API key present; AI layout prompt extended for compact PDF CSS; deprecation notice if legacy `--strip-links` is passed; `extractContent()` defaults `stripLinks` to true when omitted (matches CLI).
- **Impact**: `package.json`, `src/index.ts`, `src/extractor.ts`, `src/generator.ts`, `src/ai-layout.ts`, `src/content-filter.ts` (new), `README.md`, `USAGE.md`, `KNOWLEDGE.md`, `docs/decisions/DECISIONS.md`

### [2026-04-11] - Bundled chrome-headless-shell fallback (zip beside executable)
- **Author**: AI-assisted
- **Changes**: Added `extract-zip` runtime extraction with optional `.zip.sha256` verification and `.buildid` / `.chromium-version` re-extract rules; `npm run download:chromium` (via `@puppeteer/browsers`, `unpack: false`) produces `build/chromium-<platform>-<arch>.zip` + sidecars; `build:exe` runs download before `pkg`; CLI primes browser with ora progress during first-time extract; GitHub Actions cache + `CHROMIUM_DOWNLOAD_CURRENT=1` for per-runner downloads; documented in README, USAGE, KNOWLEDGE.
- **Impact**: `package.json`, `package-lock.json`, `scripts/download-chromium.mjs`, `src/browser-utils.ts`, `src/index.ts`, `src/crawler.ts`, `src/extractor.ts`, `src/generator.ts`, `.github/workflows/npm-publish-github-packages.yml`, `README.md`, `USAGE.md`, `KNOWLEDGE.md`

### [2026-04-10] - Mandatory browser detection with PATH lookup
- **Author**: AI-assisted
- **Changes**: Enhanced browser detection to use `where`/`which` commands as fallback when filesystem paths fail; browser detection is now mandatory (throws `BrowserNotFoundError` instead of falling back to Puppeteer's bundled Chromium); returns browser name alongside path for clearer user feedback. This fixes `pkg` packaging failures caused by Puppeteer trying to spawn bundled Chromium which triggers antivirus blocks.
- **Impact**: `src/browser-utils.ts`

### [2026-04-09] - Bundle stealth evasion modules for pkg executable
- **Author**: AI-assisted
- **Changes**: Added explicit `pkg.scripts` entries for `puppeteer-extra-plugin-stealth` evasion sub-modules and shared `_utils` so the dynamically-required evasions are included in the packaged executable snapshot.
- **Impact**: `package.json`

### [2026-04-10] - Add optional stripping of external URLs
- **Author**: AI-assisted
- **Changes**: Added `--strip-links` CLI flag and extraction pipeline option to replace non-anchor links with plain text before URL normalization; documented usage in README and USAGE.
- **Impact**: `src/index.ts`, `src/extractor.ts`, `README.md`, `USAGE.md`, `KNOWLEDGE.md`

### [2026-04-09] - Stabilize pkg packaging inputs and Puppeteer runtime
- **Author**: AI-assisted
- **Changes**: Switched dependency from `puppeteer` to `puppeteer-core`, cleaned `dist` before TypeScript builds to avoid stale outputs during packaging, narrowed `pkg` script entry to `dist/index.js`, and aligned browser module typing/imports to `puppeteer-core`.
- **Impact**: `package.json`, `package-lock.json`, `src/browser-utils.ts`, `src/crawler.ts`, `src/extractor.ts`, `src/generator.ts`

### [2026-04-09] - Merge local main with origin/main
- **Author**: AI-assisted
- **Changes**: Local `main` and `origin/main` had diverged from `2933f07`: local tip `bcbf693` (Mar 24 scraping commit) vs remote tip `593e3f7` (squash merge of PR #1 with AI PDF layout and review fixes). Merged `origin/main` into `main` and resolved conflicts in `browser-utils.ts`, `crawler.ts`, and `extractor.ts` using the PR-reviewed versions.
- **Impact**: `main` now includes both histories; working tree matches reviewed `origin/main` behavior for shared modules.

### [2026-04-09] - PR review round 3: typing, logging, AI timeouts
- **Author**: AI-assisted
- **Changes**: Replaced blanket `@ts-ignore` export in browser utils with explicit typed cast for `puppeteer`; switched generator-stage AI messages to spinner-safe `info/warn` output; added abort-based timeout handling to AI provider fetch requests to avoid indefinite hangs
- **Impact**: `src/browser-utils.ts`, `src/index.ts`, `src/ai-layout.ts`

### [2026-04-09] - PR review round 2: security, correctness, UX, CI
- **Author**: AI-assisted
- **Changes**: Reject `@import` and unsafe `url()` schemes in AI CSS validation; validate `concurrencyLimit` (clamp >=1); resolve relative iframe `src` against article URL instead of dummy host; separate scroll attempts from page navigation count in crawler; remove nested ora spinner from `extractContent` (CLI handles display); use Anthropic Messages API content-block array format; scope CI pkg packaging to single matrix target per runner
- **Impact**: `src/ai-layout.ts`, `src/extractor.ts`, `src/crawler.ts`, `.github/workflows/npm-publish-github-packages.yml`

### [2026-04-09] - PR review: Node 20, crawler/extractor hardening
- **Author**: AI-assisted
- **Changes**: Enforced Node `>=20` in `package.json` and docs (aligns with `p-limit` 7); README badge and pkg example targets; safe iframe link DOM (http/https only, no `innerHTML` interpolation); removed invalid `:has-text` selector and added anchor-text “Next” fallback; single ora spinner during concurrent extraction; KNOWLEDGE footer and changelog placeholder cleanup
- **Impact**: `package.json`, `README.md`, `src/extractor.ts`, `src/crawler.ts`, `KNOWLEDGE.md`

### [2026-04-09] - GitHub Actions: build, package matrix, release assets
- **Author**: Human
- **Changes**: Workflow runs TypeScript build on push/PR to main; matrix packaging for Linux/Windows/macOS executables; publish to GitHub Packages only on `release`; upload-release-asset steps for binaries; Node.js 22 in CI
- **Impact**: `.github/workflows/npm-publish-github-packages.yml`

### [2026-03-24] - Comprehensive Scraping Enhancements
- **Author**: AI-assisted
- **Commit**: `bcbf693`
- **Changes**: Added puppeteer-extra with stealth plugin for anti-bot bypass
- **Impact**: `package.json`, crawler/extractor modules

### [2026-04-07] - AI Layout Mode (PDF-only v1)
- **Author**: AI-assisted
- **Changes**: Added `--layout-mode ai` flow with provider/model/API key options, metadata-only AI prompting, CSS validation, local cache, and graceful fallback to static styling
- **Impact**: `src/index.ts`, `src/generator.ts`, `src/ai-layout.ts`

### [2026-03-23] - GitHub Actions Workflow
- **Author**: Human
- **Commit**: `2933f07`
- **Changes**: Added npm package publishing workflow
- **Impact**: `.github/workflows/`

### [2024-xx-xx] - Gitignore Update
- **Author**: Human
- **Commit**: `ac93f59`
- **Changes**: Added generated PDF/EPUB files to gitignore
- **Impact**: `.gitignore`

### [2024-xx-xx] - Whitespace Fix
- **Author**: Human
- **Commit**: `f184bfc`
- **Changes**: Reduced excessive whitespace in content extraction
- **Impact**: `extractor.ts`

### [2024-xx-xx] - EPUB Content Handling
- **Author**: Human
- **Commit**: `746b0df`
- **Changes**: Improved EPUB generation content handling
- **Impact**: `generator.ts`

### [2024-xx-xx] - Executable Packaging Fix
- **Author**: Human
- **Commit**: `cef2a35`
- **Changes**: Fixed packaging with @yao-pkg/pkg for Node 22
- **Impact**: `package.json`, build configuration

### [2024-xx-xx] - Initial Release
- **Author**: Human
- **Commits**: `20153ea` through `5c65c21`
- **Changes**: Initial project setup with full feature set
- **Impact**: Complete codebase

---

## 5. AI Suggestions

### Improvements to Consider

1. **Configuration File Support**
   - Add support for `.ebookscaperc` or `ebook-scape.config.js`
   - Allow persistent default settings per project

2. **Output Customization**
   - Custom CSS/styling for PDF output
   - Template support for different ebook formats
   - Font selection options

3. **Caching Layer**
   - Cache extracted content to avoid re-fetching
   - Incremental updates for large blogs

4. **Testing Infrastructure**
   - Vitest in place for pure helpers; extend with Puppeteer mocks or integration tests
   - Mock Puppeteer for faster CI
   - Add integration test suite

5. **Progress Reporting**
   - Detailed progress for long-running operations
   - Estimated time remaining
   - Resume capability for interrupted jobs

6. **Content Enhancements**
   - Image optimization/compression
   - Code syntax highlighting in output
   - Custom cover page generation

### Known Issues

- Rule-based filter patterns are English-centric; false positives/negatives possible for other languages
- Some sites with aggressive anti-bot measures may still block scraping
- Very large articles may cause memory issues
- No retry mechanism for failed individual articles
- `pkg` executable runtime can miss stealth plugin evasion submodules unless explicitly bundled as assets

### Technical Debt

- Test files (`test-*.ts`) could be moved to dedicated `tests/` directory
- Consider adding ESLint/Prettier for code consistency
- Type definitions for chrome-paths could be contributed upstream

---

*Last Updated: 2026-04-11 (comprehensive lazy-load expansion + shared non-content selectors)*
*Next Review: Before next commit*
