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
| **Browser Detection** | Automatically finds system Chrome/Edge/Chromium for standalone executables |
| **Cross-Platform Executables** | Standalone binaries for Linux, Windows, and macOS via pkg |
| **Anti-Bot Bypass** | Puppeteer stealth plugin to avoid detection on protected sites |
| **AI Layout Mode (PDF v1)** | Optional AI-generated CSS stylesheet for PDF output using metadata-only prompts, with cache + validation + static fallback |

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
| puppeteer | ^22.0.0 | Headless browser automation |
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
| fetch (Node built-in) | Node 20+ | AI provider REST calls (Gemini/OpenAI/Anthropic) without SDKs |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.4.0 | TypeScript compiler |
| @yao-pkg/pkg | ^6.14.1 | Executable packaging |
| ts-node | ^10.9.0 | TypeScript execution |
| @types/* | various | Type definitions |

---

## 3. Architecture

### Module Structure

```
src/
├── index.ts          # CLI entry point (Commander setup)
├── crawler.ts        # Article discovery & URL crawling
├── extractor.ts      # Content extraction with Readability
├── generator.ts      # PDF & EPUB generation (+ optional AI CSS for PDF)
├── ai-layout.ts      # AI prompt building, metadata extraction, CSS validation, caching
├── browser-utils.ts  # Browser detection utilities
└── chrome-paths.d.ts # Type definitions for chrome-paths
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
│ extractor.ts │  ── extractContent() ──► Array<{title, contentHTML}>
└──────────────┘
      │
      ▼
┌──────────────┐
│  ai-layout.ts│  ── getAILayout() ──► CSS string (optional, cached)
└──────────────┘
      │
      ▼
┌──────────────┐
│ generator.ts │  ── buildPDF(css?) / buildEPUB() ──► Output file
└──────────────┘
```

### Key Design Decisions

1. **Shared Browser Instance**: Single Puppeteer browser instance shared across operations for efficiency
2. **Request Interception**: Block unnecessary resources during discovery phase, allow during extraction
3. **Lazy Loading Support**: Auto-scroll pages to trigger lazy-loaded content
4. **Graceful Degradation**: Continue processing even if individual articles fail
5. **Local Browser Preference**: Use system browser when available, fallback to bundled Chromium

### Output Formats

| Format | Library | Features |
|--------|---------|----------|
| PDF | Puppeteer `page.pdf()` | TOC, page numbers, A4 format, clickable links |
| EPUB | epub-gen-memory | Chapters, navigation, reflowable content |

---

## 4. Changelog

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
   - Add Jest/Vitest for unit tests
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

- Some sites with aggressive anti-bot measures may still block scraping
- Very large articles may cause memory issues
- No retry mechanism for failed individual articles

### Technical Debt

- Test files (`test-*.ts`) could be moved to dedicated `tests/` directory
- Consider adding ESLint/Prettier for code consistency
- Type definitions for chrome-paths could be contributed upstream

---

*Last Updated: 2026-04-09*
*Next Review: Before next commit*
