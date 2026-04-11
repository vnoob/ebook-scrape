import * as crypto from 'crypto';
import { JSDOM } from 'jsdom';
import { ArticleContent } from './extractor.js';
import type { AIOptions } from './ai-layout.js';

const AI_REQUEST_TIMEOUT_MS = 30000;

/** Result of filtering articles for ebook inclusion. */
export interface FilterResult {
  articles: ArticleContent[];
  omitted: OmittedPage[];
}

/** A page that was excluded from the ebook with a human-readable reason. */
export interface OmittedPage {
  url: string;
  title: string;
  reason: string;
}

/** Options for rule-based {@link filterContent}. */
export interface FilterOptions {
  /** Minimum plain-text length to keep an article (default: 100). */
  minLength?: number;
  /** Run title/body pattern checks (default: true). */
  enablePatternCheck?: boolean;
  /** Run link-heavy heuristic (default: true). */
  enableRatioCheck?: boolean;
}

const DEFAULT_MIN_LENGTH = 100;
const ERROR_TITLE_RE = /(404|not\s+found|page\s+not\s+found|access\s+denied|forbidden|error)/i;
/**
 * Extract normalized plain text from HTML for heuristics.
 * @param html - Article HTML fragment
 * @returns Collapsed plain text
 */
function extractPlainText(html: string): string {
  try {
    const dom = new JSDOM(`<body>${html}</body>`);
    const text = dom.window.document.body?.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/**
 * Ratio of characters that appear inside anchor text vs total plain text.
 * @param html - HTML fragment
 * @param plainText - Precomputed plain text
 * @returns Number in [0, 1], or 0 if no text
 */
function linkTextRatio(html: string, plainText: string): number {
  try {
    const dom = new JSDOM(`<body>${html}</body>`);
    const doc = dom.window.document;
    let linkLen = 0;
    doc.querySelectorAll('a').forEach((a) => {
      linkLen += (a.textContent || '').length;
    });
    const total = plainText.length || 1;
    return linkLen / total;
  } catch {
    return 0;
  }
}

/**
 * SHA-256 hex digest of normalized plain text for duplicate detection.
 * @param plain - Normalized plain text
 * @returns Hex hash string
 */
function contentHash(plain: string): string {
  const normalized = plain.replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Apply rule-based checks to a single article.
 * @param article - Extracted article
 * @param plain - Plain text body
 * @param title - Article title
 * @param options - Filter toggles and thresholds
 * @returns Omission reason or null if the article should be kept
 */
function ruleReasonForArticle(
  article: ArticleContent,
  plain: string,
  title: string,
  options: FilterOptions
): string | null {
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const patternOn = options.enablePatternCheck !== false;
  const ratioOn = options.enableRatioCheck !== false;

  if (plain.length < minLength) {
    return `Too short (under ${minLength} characters of text)`;
  }

  if (patternOn) {
    const t = title.trim();
    if (ERROR_TITLE_RE.test(t)) {
      return 'Error page detected (title pattern)';
    }
    if (/\b(login|sign\s*in|sign\s*up|register)\b/i.test(t)) {
      return 'Login wall detected (title pattern)';
    }
  }

  if (ratioOn && plain.length > 0) {
    const ratio = linkTextRatio(article.contentHTML, plain);
    if (ratio > 0.6) {
      return 'Navigation-heavy page (link text dominates)';
    }
  }

  return null;
}

/**
 * Filter out non-contributing pages using fast heuristics (no network).
 * @param articles - Articles in crawl order
 * @param options - Optional thresholds and toggles
 * @returns Kept articles and omitted entries with reasons
 */
export function filterContent(articles: ArticleContent[], options: FilterOptions = {}): FilterResult {
  const kept: ArticleContent[] = [];
  const omitted: OmittedPage[] = [];
  const seenHashes = new Set<string>();
  let index = 0;

  for (const article of articles) {
    index += 1;
    const plain = extractPlainText(article.contentHTML);
    const title = article.title || '(untitled)';
    const hash = contentHash(plain);

    if (index <= 100 && seenHashes.has(hash) && plain.length > 0) {
      omitted.push({
        url: article.url,
        title,
        reason: 'Duplicate content (same body as a prior article)'
      });
      continue;
    }
    if (index <= 100 && plain.length > 0) {
      seenHashes.add(hash);
    }

    const reason = ruleReasonForArticle(article, plain, title, options);
    if (reason) {
      omitted.push({ url: article.url, title, reason });
    } else {
      kept.push(article);
    }
  }

  return { articles: kept, omitted };
}

/**
 * Split an array into chunks of at most `size` elements.
 * @param arr - Input array
 * @param size - Chunk size (>= 1)
 * @returns Array of chunks
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Build the smart-filter prompt for one batch of articles.
 * @param batch - Up to 10 articles
 * @returns Prompt string
 */
function buildSmartFilterPrompt(batch: ArticleContent[]): string {
  const lines = batch.map((a, i) => {
    const plain = extractPlainText(a.contentHTML);
    const snippet = plain.slice(0, 200).replace(/\s+/g, ' ');
    const title = (a.title || '(untitled)').replace(/\s+/g, ' ').trim();
    return `${i + 1}. Title: "${title}" | URL: ${a.url} | Length: ${plain.length} chars | Snippet: "${snippet}"`;
  });

  return `You are a content quality filter for an ebook generator.

For each numbered article below, decide if it should be INCLUDED in the book or OMITTED.
OMIT pages that are: HTTP error pages (404, 500), login/auth walls, empty/stub pages,
navigation-only pages, obvious duplicates of another item in this list, or non-article pages
(about/contact/legal index) that do not carry substantive reading content.

Articles:
${lines.join('\n')}

Respond with ONLY a JSON array of exactly ${batch.length} objects, one per article in order, each like:
{"include": true, "reason": "brief explanation only when omitted"}
Use "include": true for substantive blog posts/articles; false otherwise.
No markdown fences, no other text.`;
}

/**
 * Parse model response into include flags; returns null if invalid.
 * @param raw - Raw model text
 * @param expectedLength - Number of decisions required
 * @returns Array of { include, reason } or null
 */
function parseFilterDecisions(
  raw: string,
  expectedLength: number
): Array<{ include: boolean; reason: string }> | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== expectedLength) {
    return null;
  }
  const out: Array<{ include: boolean; reason: string }> = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') return null;
    const inc = (item as { include?: unknown }).include;
    if (typeof inc !== 'boolean') return null;
    const reason = (item as { reason?: unknown }).reason;
    const reasonStr = typeof reason === 'string' ? reason : inc ? '' : 'Omitted by filter';
    out.push({ include: inc, reason: reasonStr });
  }
  return out;
}

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenAI(prompt: string, model: string, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(prompt: string, model: string, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    return data.content?.find((block) => block.type === 'text')?.text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call the configured AI provider and return raw text.
 * @param prompt - User prompt
 * @param options - Provider, model, API key
 * @returns Model text or null on failure
 */
async function callAIProvider(prompt: string, options: AIOptions): Promise<string | null> {
  if (options.provider === 'gemini') {
    return callGemini(prompt, options.model, options.apiKey);
  }
  if (options.provider === 'openai') {
    return callOpenAI(prompt, options.model, options.apiKey);
  }
  return callAnthropic(prompt, options.model, options.apiKey);
}

/**
 * Filter articles using an AI model (batched). Falls back to rule-based filtering per batch if the model response is invalid.
 * @param articles - Extracted articles in order
 * @param aiOptions - Provider credentials (same as AI layout)
 * @returns Promise resolving to kept articles and per-URL omission reasons
 */
export async function smartFilterContent(
  articles: ArticleContent[],
  aiOptions: AIOptions
): Promise<FilterResult> {
  const kept: ArticleContent[] = [];
  const omitted: OmittedPage[] = [];
  const batches = chunkArray(articles, 10);

  for (const batch of batches) {
    const prompt = buildSmartFilterPrompt(batch);
    let raw: string | null = null;
    try {
      raw = await callAIProvider(prompt, aiOptions);
    } catch {
      raw = null;
    }

    const decisions = raw ? parseFilterDecisions(raw, batch.length) : null;

    if (!decisions) {
      const fallback = filterContent(batch);
      kept.push(...fallback.articles);
      omitted.push(...fallback.omitted);
      continue;
    }

    for (let i = 0; i < batch.length; i++) {
      const article = batch[i];
      const d = decisions[i];
      const title = article.title || '(untitled)';
      if (d.include) {
        kept.push(article);
      } else {
        omitted.push({
          url: article.url,
          title,
          reason: d.reason || 'Omitted by smart filter'
        });
      }
    }
  }

  return { articles: kept, omitted };
}
