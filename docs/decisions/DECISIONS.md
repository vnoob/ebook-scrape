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
