import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Article } from './generator.js';

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIOptions {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

export interface ContentMetadata {
  articleCount: number;
  totalCharacters: number;
  avgArticleLength: number;
  codeBlockCount: number;
  imageCount: number;
  tableCount: number;
  headingDepth: number;
  listCount: number;
  blockquoteCount: number;
  hasLongArticles: boolean;
  articleTitles: string[];
}

const CACHE_DIR = path.join(os.homedir(), '.ebook-scape', 'cache');

export function extractContentMetadata(articles: Article[]): ContentMetadata {
  const articleTitles: string[] = [];
  let totalCharacters = 0;
  let totalLength = 0;
  let codeBlockCount = 0;
  let imageCount = 0;
  let tableCount = 0;
  let headingDepth = 1;
  let listCount = 0;
  let blockquoteCount = 0;
  let hasLongArticles = false;

  for (const article of articles) {
    articleTitles.push(article.title);
    const html = article.contentHTML;
    const length = html.length;
    totalCharacters += length;
    totalLength += article.contentHTML.length;
    hasLongArticles = hasLongArticles || length > 10000;

    codeBlockCount += (html.match(/<(pre|code)\b/gi) || []).length;
    imageCount += (html.match(/<img\b/gi) || []).length;
    tableCount += (html.match(/<table\b/gi) || []).length;
    listCount += (html.match(/<(ul|ol)\b/gi) || []).length;
    blockquoteCount += (html.match(/<blockquote\b/gi) || []).length;

    const headingMatches = html.match(/<h([1-6])\b/gi) || [];
    for (const heading of headingMatches) {
      const level = Number(heading[2]);
      if (!Number.isNaN(level)) {
        headingDepth = Math.max(headingDepth, level);
      }
    }    
  }

  const avgLength = articles.length ? Math.round(totalLength / articles.length) : 0;
  return {
    articleCount: articles.length,
    totalCharacters,
    avgArticleLength: avgLength,
    codeBlockCount,
    imageCount,
    tableCount,
    headingDepth,
    listCount,
    blockquoteCount,
    hasLongArticles,
    articleTitles
  };
}

function getCacheKey(metadata: ContentMetadata, provider: AIProvider, model: string): string {
  const payload = JSON.stringify({ metadata, provider, model });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

async function getCachedCSS(cacheKey: string): Promise<string | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${cacheKey}.css`);
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function cacheCSS(cacheKey: string, css: string): Promise<void> {
  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(CACHE_DIR, `${cacheKey}.css`), css, 'utf-8');
  } catch {
    // Non-fatal.
  }
}

function buildPrompt(metadata: ContentMetadata): string {
  return `You are an expert CSS designer for PDF ebook generation.

## Your task
Write a complete CSS stylesheet for an HTML ebook document. The stylesheet will be rendered
by a headless Chromium browser and printed to a PDF (A4 format, margins handled externally).

## HTML structure you must style
The HTML uses these exact classes and structure - you CANNOT change the HTML, only write CSS for it:

  body
  ├── div.toc
  │   ├── h1
  │   └── ul.toc-list
  │       └── li.toc-item (xN)
  │           └── a
  │               └── span.toc-item-number
  └── div.chapter#chapter-{n} (xN, one per article)
      ├── h1
      └── (article content - may contain h2..h6, p, pre>code, code, blockquote, ul/ol, table, img, a)

## Content profile
- ${metadata.articleCount} articles, avg ${metadata.avgArticleLength} chars each
- ${metadata.codeBlockCount} code blocks
- ${metadata.imageCount} images
- ${metadata.tableCount} tables
- ${metadata.listCount} lists
- ${metadata.blockquoteCount} blockquotes
- Heading depth: h1-h${metadata.headingDepth}
- Has long articles (>10k chars): ${metadata.hasLongArticles}

## Requirements
1. Return ONLY valid CSS - no markdown fences, no explanation
2. Start with: * { margin: 0; padding: 0; box-sizing: border-box; }
3. Include page-break rules for .toc and .chapter
4. Style code blocks, tables, links, and images
5. Include @media print rules
6. Keep CSS production-safe for Chromium print rendering

## Layout efficiency (IMPORTANT)
- Use compact vertical rhythm: avoid large padding/margins on body, .toc, and .chapter (prefer modest values so pages are not half empty)
- Headings: about 0.5em margin above and 0.3em below; body line-height about 1.4; heading line-height about 1.2
- Only use page-break-before on .chapter (and .toc as needed); avoid extra page-break-before/after on inner elements except where necessary for headings
- Images: max-width 100%; let them flow with text; avoid rules that force large blank areas before/after images
- Lists and blockquotes: tight spacing; avoid orphan/widow CSS that creates large gaps in print
- Tables: prefer avoiding page-break-inside: avoid on large containers; keep table typography compact
- Code blocks: modest padding (e.g. 0.5em), avoid min-height that wastes space

## Output format
Return raw CSS only.`;
}

function sanitizeCSS(raw: string): string {
  return raw
    .replace(/```css/gi, '')
    .replace(/```/g, '')
    .trim();
}

export function validateCSS(css: string): boolean {
  if (!css || css.trim().length < 100) return false;
  if (css.includes('<') || css.includes('```')) return false;

  const required = ['body', '.toc', '.chapter'];
  if (!required.every((selector) => css.includes(selector))) return false;

  const openBraces = (css.match(/\{/g) || []).length;
  const closeBraces = (css.match(/\}/g) || []).length;
  if (openBraces !== closeBraces || openBraces < 5) return false;

  if (/@import\b/i.test(css)) return false;

  const unsafeUrlScheme = /url\s*\(\s*['"]?\s*(file:|data:|javascript:|vbscript:|chrome:|chrome-extension:)/i;
  if (unsafeUrlScheme.test(css)) return false;

  return true;
}

async function callGemini(prompt: string, model: string, apiKey: string): Promise<string | null> {
  const AI_REQUEST_TIMEOUT_MS = 30000;
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
  const AI_REQUEST_TIMEOUT_MS = 30000;
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
        temperature: 0.7
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
  const AI_REQUEST_TIMEOUT_MS = 30000;
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

export async function getAILayout(articles: Article[], options: AIOptions, noCache: boolean = false): Promise<string | null> {
  const metadata = extractContentMetadata(articles);
  const cacheKey = getCacheKey(metadata, options.provider, options.model);

  if (!noCache) {
    const cached = await getCachedCSS(cacheKey);
    if (cached) return cached;
  }

  const prompt = buildPrompt(metadata);
  let rawCSS: string | null = null;

  if (options.provider === 'gemini') {
    rawCSS = await callGemini(prompt, options.model, options.apiKey);
  } else if (options.provider === 'openai') {
    rawCSS = await callOpenAI(prompt, options.model, options.apiKey);
  } else {
    rawCSS = await callAnthropic(prompt, options.model, options.apiKey);
  }

  if (!rawCSS) return null;
  const css = sanitizeCSS(rawCSS);
  if (!validateCSS(css)) return null;

  await cacheCSS(cacheKey, css);
  return css;
}

export function getDefaultModel(provider: AIProvider): string {
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'anthropic') return 'claude-haiku-4';
  return 'gemini-2.0-flash';
}
