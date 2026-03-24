import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { Browser, Page } from 'puppeteer';
import pLimit from 'p-limit';
import ora from 'ora';
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
 * Replace iframe elements with clickable fallback links
 * @param document - JSDOM document
 */
function replaceIframesWithLinks(document: Document): void {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) {
      const fallbackElement = document.createElement('p');
      fallbackElement.innerHTML = `<strong>[Embedded Media]</strong> <a href="${src}" target="_blank" rel="noopener noreferrer">${src}</a>`;
      
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
function preprocessHTMLForReadability(document: Document): void {
  preserveCodeBlockWhitespace(document);
  replaceIframesWithLinks(document);
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
 * Extract content from a single URL
 * @param browser - Shared browser instance
 * @param url - URL to extract content from
 * @param spinner - Ora spinner for status updates
 * @returns Promise containing extracted article content or null if failed
 */
async function extractSingleUrl(
  browser: Browser,
  url: string,
  spinner: ora.Ora
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
    
    preprocessHTMLForReadability(document);
    
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      spinner.warn(`Failed to parse article from: ${url}`);
      return null;
    }

    const contentWithAbsoluteUrls = convertRelativeUrlsToAbsolute(article.content, url);

    spinner.succeed(`Extracted: ${article.title}`);

    return {
      title: article.title,
      contentHTML: contentWithAbsoluteUrls
    };
  } catch (error) {
    spinner.fail(`Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * @returns Promise containing array of extracted article content
 */
export async function extractContent(
  urls: string[],
  concurrencyLimit: number = 5
): Promise<ArticleContent[]> {
  let browser: Browser | null = null;
  const limit = pLimit(concurrencyLimit);

  try {
    // @ts-ignore - puppeteer-extra is compatible with puppeteer API
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const spinner = ora({
      text: `Starting extraction of ${urls.length} articles...`,
      color: 'cyan'
    }).start();

    const extractionPromises = urls.map((url, index) =>
      limit(async () => {
        spinner.text = `Processing ${index + 1}/${urls.length}: ${url}`;
        return extractSingleUrl(browser!, url, ora());
      })
    );

    const results = await Promise.all(extractionPromises);

    const successfulResults = results.filter((result): result is ArticleContent => result !== null);

    spinner.succeed(`Extraction complete: ${successfulResults.length}/${urls.length} articles extracted successfully`);

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
    
    preprocessHTMLForReadability(document);
    
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
