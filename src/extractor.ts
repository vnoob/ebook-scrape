import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Browser, Page } from 'puppeteer-core';
import pLimit from 'p-limit';
import { getPuppeteerLaunchOptions, puppeteer, REALISTIC_USER_AGENT } from './browser-utils.js';

export interface ExtractedContent {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string | null;
  dir: string | null;
  siteName: string | null;
  lang: string | null;
}

export interface ArticleContent {
  title: string;
  contentHTML: string;
}

export interface ExtractionOptions {
  stripLinks?: boolean;
}

/**
 * Scroll the page to load lazy-loaded images
 * @param page - Puppeteer page instance
 */
async function autoScrollPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Clean up excessive whitespace in HTML content
 * @param html - HTML content
 * @returns Cleaned HTML
 */
function cleanHTMLWhitespace(html: string): string {
  return html
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Preserve whitespace in code blocks by adding inline styles
 * @param document - JSDOM document
 */
function preserveCodeBlockWhitespace(document: Document): void {
  const preElements = document.querySelectorAll('pre');
  preElements.forEach((pre) => {
    const existingStyle = pre.getAttribute('style') || '';
    pre.setAttribute('style', `${existingStyle}; white-space: pre-wrap; font-family: monospace; background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;`);
  });

  const codeElements = document.querySelectorAll('code');
  codeElements.forEach((code) => {
    const isInPre = code.closest('pre');
    if (!isInPre) {
      const existingStyle = code.getAttribute('style') || '';
      code.setAttribute('style', `${existingStyle}; white-space: pre; font-family: monospace; background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px;`);
    }
  });
}

/**
 * Resolve iframe src to an http(s) URL only; blocks javascript: and other schemes.
 * @param src - Raw src attribute
 * @returns Safe href or null
 */
function safeIframeHttpHref(src: string, baseUrl: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || /^javascript:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Replace iframe elements with clickable fallback links
 * @param document - JSDOM document
 */
function replaceIframesWithLinks(document: Document, baseUrl: string): void {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) {
      const safeHref = safeIframeHttpHref(src, baseUrl);
      if (!safeHref) {
        iframe.remove();
        return;
      }
      const fallbackElement = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = '[Embedded Media]';
      fallbackElement.appendChild(strong);
      fallbackElement.appendChild(document.createTextNode(' '));
      const link = document.createElement('a');
      link.href = safeHref;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = safeHref;
      fallbackElement.appendChild(link);
      iframe.parentNode?.replaceChild(fallbackElement, iframe);
    } else {
      iframe.remove();
    }
  });
}

/**
 * Preprocess HTML before passing to Readability
 * @param document - JSDOM document
 */
function preprocessHTMLForReadability(document: Document, baseUrl: string): void {
  preserveCodeBlockWhitespace(document);
  replaceIframesWithLinks(document, baseUrl);
}

/**
 * Remove unwanted elements from HTML
 * @param document - JSDOM document
 */
function removeUnwantedElements(document: Document): void {
  const selectorsToRemove = [
    'script',
    'style',
    'noscript',
    '.ad',
    '.advertisement',
    '.social-share',
    '.comments',
    '.related-posts',
    '.newsletter-signup',
    '[class*="share"]',
    '[class*="social"]',
    '[id*="comments"]',
    'nav',
    'footer:not(.chapter footer)',
    'header:not(.chapter header)',
    '.sidebar',
    'aside'
  ];

  selectorsToRemove.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  const emptyElements = document.querySelectorAll('p:empty, div:empty, span:empty');
  emptyElements.forEach(el => {
    if (!el.querySelector('img, br, hr')) {
      el.remove();
    }
  });
}

/**
 * Convert relative URLs to absolute URLs and clean HTML content
 * @param html - HTML content
 * @param baseUrl - Base URL for resolving relative paths
 * @returns Cleaned HTML with absolute URLs
 */
function convertRelativeUrlsToAbsolute(html: string, baseUrl: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  removeUnwantedElements(document);

  const images = document.querySelectorAll('img[src]');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        img.setAttribute('src', absoluteUrl);
        img.removeAttribute('srcset');
        img.removeAttribute('loading');
      } catch (error) {
        console.warn(`Failed to convert image URL: ${src}`);
      }
    }
  });

  const links = document.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        link.setAttribute('href', absoluteUrl);
      } catch (error) {
        console.warn(`Failed to convert link URL: ${href}`);
      }
    }
  });

  let cleanedHTML = document.body.innerHTML;
  cleanedHTML = cleanHTMLWhitespace(cleanedHTML);

  return cleanedHTML;
}

/**
 * Strip non-anchor links from document, preserving visible text content.
 * @param document - JSDOM document
 * @returns Number of links stripped
 */
function stripExternalLinks(document: Document): number {
  const links = document.querySelectorAll('a[href]');
  let strippedCount = 0;

  links.forEach((link) => {
    try {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || !link.parentNode) {
        return;
      }

      const text = document.createTextNode(link.textContent || '');
      link.parentNode.replaceChild(text, link);
      strippedCount++;
    } catch {
      const rawHref = link.getAttribute('href') || '(unknown href)';
      console.warn(`Failed to strip link: ${rawHref}`);
    }
  });

  return strippedCount;
}

/**
 * Extract content from a single URL
 * @param browser - Shared browser instance
 * @param url - URL to extract content from
 * @param options - Extraction options
 * @returns Promise containing extracted article content or null if failed
 */
async function extractSingleUrl(
  browser: Browser,
  url: string,
  options: ExtractionOptions = {}
): Promise<ArticleContent | null> {
  let page: Page | null = null;

  try {
    page = await browser.newPage();

    await page.setUserAgent(REALISTIC_USER_AGENT);

    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await autoScrollPage(page);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const html = await page.content();

    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    preprocessHTMLForReadability(document, url);

    if (options.stripLinks) {
      const strippedCount = stripExternalLinks(document);
      if (strippedCount > 0) {
        console.debug(`Stripped ${strippedCount} link(s) from: ${url}`);
      }
    }

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      console.warn(`Failed to parse article from: ${url}`);
      return null;
    }

    const contentWithAbsoluteUrls = convertRelativeUrlsToAbsolute(article.content, url);

    return {
      title: article.title,
      contentHTML: contentWithAbsoluteUrls
    };
  } catch (error) {
    console.warn(
      `Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return null;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

/**
 * Extract content from multiple URLs using Puppeteer and Readability
 * @param urls - Array of URLs to extract content from
 * @param concurrencyLimit - Maximum number of concurrent pages (default: 5)
 * @param options - Optional extraction behavior (e.g. strip non-anchor links before parsing)
 * @returns Promise containing array of extracted article content
 */
export async function extractContent(
  urls: string[],
  concurrencyLimit: number = 5,
  options: ExtractionOptions = {}
): Promise<ArticleContent[]> {
  let browser: Browser | null = null;
  const safeConcurrency = Math.max(1, Math.floor(concurrencyLimit) || 1);
  const limit = pLimit(safeConcurrency);

  try {
    // @ts-ignore - puppeteer-extra is compatible with puppeteer API
    browser = await puppeteer.launch(await getPuppeteerLaunchOptions());

    const extractionPromises = urls.map((url) =>
      limit(async () => {
        return extractSingleUrl(browser!, url, options);
      })
    );

    const results = await Promise.all(extractionPromises);

    const successfulResults = results.filter((result): result is ArticleContent => result !== null);

    return successfulResults;
  } catch (error) {
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Extracts readable content from HTML using Mozilla Readability
 * @param html - The HTML content to parse
 * @returns Promise containing the extracted readable content
 */
export async function extract(html: string): Promise<ExtractedContent> {
  try {
    const dom = new JSDOM(html, {
      url: 'https://example.com'
    });

    const document = dom.window.document;
    
    preprocessHTMLForReadability(document, 'https://example.com');
    
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      throw new Error('Failed to parse article content');
    }

    return {
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      dir: article.dir,
      siteName: article.siteName,
      lang: article.lang
    };
  } catch (error) {
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
