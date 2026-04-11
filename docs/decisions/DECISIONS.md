# Architecture & Feature Decisions

> Persistent log of key decisions made during planning and implementation.
> Both the BA/Tech Lead skill and Engineer agent read and write to this file.

---

## [2026-04-08] AI Layout Mode — Level A (CSS-only)

- **Decision**: The AI generates a complete CSS stylesheet; HTML structure stays fixed. No presets.
- **Alternatives rejected**:
  - *Preset selection*: AI picks from 5 predefined templates — rejected because user wants genuine AI creative control over layout
  - *Level B (CSS + HTML structure)*: AI modifies HTML wrappers — rejected due to validation complexity and content integrity risk
  - *Level C (full template)*: AI controls entire HTML — rejected as too risky for v1
- **Owner**: BA/Tech Lead
- **Status**: Approved

## [2026-04-08] AI Layout Mode — No SDK dependencies

- **Decision**: Use native `fetch` for all AI provider calls (Gemini, OpenAI, Anthropic). No `openai` or `@anthropic-ai/sdk` packages.
- **Alternatives rejected**:
  - *Install both SDKs*: Adds ~3 MB to node_modules, inflates executables, creates version churn
  - *Install one SDK + fetch for others*: Inconsistent approach
- **Owner**: BA/Tech Lead
- **Status**: Approved

## [2026-04-08] AI Layout Mode — API key auth only, no OAuth

- **Decision**: Authentication via `--ai-api-key` flag or `EBOOK_SCAPE_*_API_KEY` environment variables. No OAuth browser redirect flow.
- **Alternatives rejected**:
  - *OAuth with token caching*: Over-engineered for a CLI tool; adds `open` dependency and UX friction
- **Owner**: BA/Tech Lead
- **Status**: Approved

## [2026-04-08] AI Layout Mode — PDF-only scope for v1

- **Decision**: AI layout applies to PDF output only. EPUB uses its existing pipeline unchanged.
- **Alternatives rejected**:
  - *Both formats in v1*: EPUB has a separate generation path (`epub-gen-memory`); adding AI CSS there requires different integration work
- **Owner**: BA/Tech Lead
- **Status**: Approved

## [2026-04-09] PR #1 Round 2 Review — Tech Lead Plan Review

- **Decision**: Reordered the 7 fix items by risk (security > crash > correctness > UX > CI). Downgraded Anthropic content-field fix from "bug" to "hardening" — the string shorthand is valid per API docs but the array form is preferred for explicitness. Kept `package.json` pkg targets unchanged (all 3 platforms) for local dev convenience; CI overrides with `--targets` per matrix entry.
- **Alternatives rejected**:
  - *Changing package.json pkg targets*: Would break local `npm run build:exe` convenience for developers who want all platforms at once
  - *Dropping Anthropic fix entirely*: While valid today, the array form is more robust against future API changes
  - *Separate PR per fix*: Overhead not justified for 7 small, independent fixes on the same PR
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-09] PR #1 Round 2 — Scroll vs Page Count Strategy

- **Decision**: Track `scrollAttempts` separately from `currentPage`, capped at `maxScrollAttempts = 3`. Reset scroll budget after each successful page navigation. Preserve the `while (currentPage <= maxPages)` outer guard for page-level termination.
- **Alternatives rejected**:
  - *Increment currentPage on scroll*: Conflates two concepts; a scroll-heavy site exhausts the page budget without visiting new pages
  - *Remove the outer loop guard*: Risks infinite loops on sites with genuine infinite scroll
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-09] PR #1 Round 2 — CSS Validation Security Hardening

- **Decision**: Block `@import` entirely in AI-generated CSS. For `url()`, only reject unsafe schemes (`file:`, `data:`, `javascript:`, `vbscript:`, `chrome:`, `chrome-extension:`). Allow `url()` with `http:`/`https:` schemes.
- **Alternatives rejected**:
  - *Block all url()*: Too aggressive — legitimate HTTPS font/image URLs would be rejected
  - *Allowlist specific domains*: Over-engineered for v1; scheme-based blocking is sufficient
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-08] AI Layout Mode — Response caching

- **Decision**: Cache AI-generated CSS in `~/.ebook-scape/cache/` keyed by hash of (content metadata + provider + model). `--no-cache` flag to bypass.
- **Alternatives rejected**:
  - *No caching*: Wastes API calls and adds latency on repeat runs
  - *In-memory only*: Doesn't persist across CLI invocations
- **Owner**: BA/Tech Lead
- **Status**: Approved

## [2026-04-10] Strip Links Feature — Strip Before URL Resolution

- **Decision**: Apply link stripping in `extractor.ts` BEFORE `convertRelativeUrlsToAbsolute()` runs, to avoid resolving URLs that will be discarded.
- **Alternatives rejected**:
  - *Strip after URL resolution*: Wastes cycles resolving URLs we'll remove
  - *Strip in generator*: Too late in pipeline; both PDF and EPUB would need separate implementations
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-10] Strip Links Feature — URL Scheme Handling

- **Decision**: Preserve only `#anchor` links. Strip all other schemes including `http:`, `https:`, `mailto:`, `tel:`, `javascript:`, and `data:`.
- **Alternatives rejected**:
  - *Domain allowlist*: Over-engineered for v1; deferred to v2
  - *Keep mailto/tel*: These are equally useless in offline/print contexts
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-10] Strip Links Feature — Error Handling Strategy

- **Decision**: On DOM manipulation error for any individual link, log a warning and preserve that link. Do not abort the article or pipeline.
- **Alternatives rejected**:
  - *Abort on error*: Too aggressive; one malformed link shouldn't break the entire document
  - *Silent failure*: Users should know if stripping partially failed
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Bundle Chromium Fallback — Security & UX Requirements

- **Decision**: Bundled chromium extraction requires SHA256 checksum verification before extraction. The flow must show a progress spinner during extraction, write a `.chromium-version` marker for upgrade detection, and clean up partial state on failure.
- **Alternatives rejected**:
  - *No checksum verification*: Security risk — tampered zips could inject malware
  - *Silent extraction*: Bad UX — first-run extraction takes 5-60 seconds with no feedback
  - *Embedded binary in exe*: Triggers antivirus false positives; inflates exe size
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Bundle Chromium Fallback — Distribution Strategy

- **Decision**: Distribute chromium as a separate `.zip` file alongside the executable, with a `.sha256` checksum file. Platform naming: `chromium-${platform}-${arch}.zip` (e.g., `chromium-win32-x64.zip`).
- **Alternatives rejected**:
  - *Single multi-platform zip*: Would force users to download ~350MB instead of ~88MB
  - *Embed in exe*: Antivirus issues; slower startup; harder to update
  - *Auto-download on first run*: Network dependency defeats "fully offline" goal
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Bundle Chromium Fallback — v1 Scope Boundaries

- **Decision**: v1 includes extraction, verification, and fallback chain only. Deferred: auto-download, version auto-update, ARM64 Windows/Linux, slim builds without chromium.
- **Alternatives rejected**:
  - *Include auto-download in v1*: Scope creep; adds network error handling, retry logic, proxy support
  - *Include ARM64 in v1*: Limited user base; can add in v1.1 based on demand
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] PDF Layout Improvements — Strip Links Default Change Strategy

- **Decision**: Changing `--strip-links` default from `false` to `true` is a breaking change requiring a two-phase rollout: (1) deprecation warning in current release, (2) default change in next minor version. Use Commander.js `--no-strip-links` pattern for the inverted flag.
- **Alternatives rejected**:
  - *Immediate default change*: Breaks existing user scripts silently
  - *Keep default as false*: Contradicts user feedback that links are rarely useful in offline PDFs
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] PDF Layout Improvements — Content Filter Architecture

- **Decision**: Implement `filterContent()` and `smartFilterContent()` in `content-filter.ts` instead of folding filtering into `extractContent()`. `extractContent()` still returns only `ArticleContent[]` (no filter metadata on that call). `ArticleContent` includes a required `url` for omission logs and smart filtering.
- **Alternatives rejected**:
  - *Tuple/extra wrapper return from extractContent()*: Noisier API for callers that only want raw extraction
  - *Filter inside extractContent()*: Violates single responsibility; makes filtering non-optional for library users
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] PDF Layout Improvements — Filter Threshold

- **Decision**: Use `textContent.length < 100` as minimum length threshold (lowered from proposed 300). Add `--no-filter` flag to disable filtering entirely.
- **Alternatives rejected**:
  - *300-char threshold*: Too aggressive; filters out legitimate short articles (poetry, announcements)
  - *No opt-out flag*: Users need escape hatch when heuristics fail
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] PDF Layout Improvements — AI Smart Filtering Activation

- **Decision**: AI smart filtering is auto-enabled when an API key is available (`--ai-api-key` or `EBOOK_SCAPE_*_API_KEY` env var). No separate `--smart-filter` flag needed. Falls back to rule-based filtering when no API key is present. `--no-filter` disables all filtering.
- **Alternatives rejected**:
  - *Separate `--smart-filter` flag*: Redundant UX; if user provided API key, they likely want AI features
  - *Rule-based only in v1*: Misses opportunity to leverage existing AI infrastructure
  - *AI-only (no rule-based fallback)*: Would break for users without API keys
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] PDF Layout Improvements — AI Smart Filtering Cost Optimization

- **Decision**: Batch 10 articles per API call to reduce costs. Send only title + length + first 200 chars (not full content). Estimated cost ~$0.001 per 10 articles with budget models.
- **Alternatives rejected**:
  - *One API call per article*: 10x cost, unacceptable for large article sets
  - *Send full content*: Wastes tokens; title + excerpt is sufficient for relevance detection
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Peripheral Content Removal — Selector Strategy

- **Decision**: Move `removeUnwantedElements()` call to pre-Readability phase (before `Readability.parse()`). Use `[class*="comment-"]` (hyphenated) instead of `[class*="comment"]` to avoid matching legitimate content like "commentary" sections. Expand selectors to cover discussions, related links, and recommendations.
- **Alternatives rejected**:
  - *Keep post-Readability only*: Too late; Readability may already include peripheral sections in extracted content
  - *Use `[class*="comment"]` (no hyphen)*: Too aggressive; matches "commentary", "uncommented", etc.
  - *Add `--no-strip-comments` flag*: Over-engineered for v1; users can file issues for edge cases
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy-Load Expansion — Live DOM Strip First

- **Decision**: Run peripheral stripping in the **live Puppeteer page** as the first step inside `expandLazyContent()` using the same selector list as JSDOM (`non-content-selectors.ts`), then reveal lazy images, scroll with mutation-based stability windows, then click safe “load more” controls only inside `article` / `main` / `[role="main"]` / `.content`. Total budget default 20s; on timeout or errors, proceed with partial DOM (do not fail extraction). Unsafe `href` schemes and URL changes after click abort the load-more loop (`goBack` best-effort).
- **Alternatives rejected**:
  - *Import selectors from `lazy-loader` into `extractor`*: Would create circular imports; shared neutral module + re-export from `extractor` keeps one list
  - *Broad `[class*="share"]` in shared list*: Replaced with `.share-buttons`, `.share-icons`, `[class*="social-"]` to reduce false positives (e.g. “Shakespeare”)
  - *Always click “read more”*: Skipped; usually navigates to another article
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Timeout and Fallback Behavior

- **Decision**: Default `totalTimeout` is 20s (not 30s). On timeout, extraction proceeds with whatever content loaded — lazy loading failure should NOT abort extraction.
- **Alternatives rejected**:
  - *30s timeout*: Combined with 60s navigation timeout = 90s worst case per article; unacceptable for large article sets
  - *Abort on timeout*: Too aggressive; partial content is better than no content
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Selector Consolidation

- **Decision**: Export `NON_CONTENT_SELECTORS` from `extractor.ts` and import into `lazy-loader.ts`. Single source of truth prevents selector drift between modules.
- **Alternatives rejected**:
  - *Duplicate selector list*: Maintenance burden; lists will diverge over time
  - *Move selectors to shared constants file*: Over-engineered; `extractor.ts` is the natural owner
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Share Selector Narrowing

- **Decision**: Change `[class*="share"]` to `.share-buttons, .share-icons, [class*="social-"]` to avoid false positives on "Shakespeare", "Share your thoughts" input fields, etc.
- **Alternatives rejected**:
  - *Keep `[class*="share"]`*: Too broad; matches legitimate content
  - *Remove share selectors entirely*: Social widgets are common and should be stripped
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Click Safety Validation

- **Decision**: Before clicking any "Load More" button, validate href is safe (reject `javascript:`, `data:`, `vbscript:` schemes). After clicking, check if URL changed; if so, call `page.goBack()` and abort click loop.
- **Alternatives rejected**:
  - *Click without validation*: Security risk; malicious pages could trigger arbitrary code
  - *Skip all buttons with href*: Too conservative; many legitimate Load More buttons have `href="#"`
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Progress Feedback

- **Decision**: Add optional `onProgress?: (phase: string) => void` callback to `LazyLoadOptions`. CLI uses this to update spinner text during long waits. Marked `@internal` — not part of public library API.
- **Alternatives rejected**:
  - *No progress feedback*: 20s silent waits make CLI appear frozen
  - *Console.log inside lazy-loader*: Violates separation of concerns; caller should control output
- **Owner**: Tech Lead
- **Status**: Approved

## [2026-04-11] Lazy Loading Support — Phased Delivery

- **Decision**: Split into Phase 1 (core module + integration + test stub) and Phase 2 (CLI flags + documentation). Enables smaller, reviewable PRs.
- **Alternatives rejected**:
  - *Single large PR*: Harder to review; delays feedback
  - *Three or more phases*: Over-engineered for the scope
- **Owner**: Tech Lead
- **Status**: Approved
