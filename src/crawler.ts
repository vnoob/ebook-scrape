import { Browser, Page } from 'puppeteer';
import { getPuppeteerLaunchOptions, puppeteer, REALISTIC_USER_AGENT } from './browser-utils.js';

/**
 * Resource types to block for faster scraping
 */
const BLOCKED_RESOURCE_TYPES = [
  'image',
  'stylesheet',
  'font',
  'media',
  'websocket',
  'manifest',
  'other'
];

/**
 * Domains to block (tracking, analytics, ads)
 */
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.com',
  'facebook.net',
  'twitter.com',
  'linkedin.com',
  'analytics',
  'ads',
  'tracking'
];

/**
 * Setup request interception to block unnecessary resources
 * @param page - Puppeteer page instance
 */
async function setupRequestInterception(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const requestUrl = request.url().toLowerCase();
    const resourceType = request.resourceType();

    if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
      request.abort();
      return;
    }

    if (BLOCKED_DOMAINS.some(domain => requestUrl.includes(domain))) {
      request.abort();
      return;
    }

    request.continue();
  });
}

/**
 * Check if a URL is likely an article link
 * @param href - The URL to check
 * @param baseUrl - The base URL for reference
 * @returns Boolean indicating if the URL is likely an article
 */
function isArticleLink(href: string, baseUrl: string): boolean {
  try {
    const url = new URL(href, baseUrl);
    const pathname = url.pathname.toLowerCase();
    const hostname = url.hostname;

    const baseHostname = new URL(baseUrl).hostname;
    if (hostname !== baseHostname) {
      return false;
    }

    const nonArticlePatterns = [
      /\/(author|user|profile|about|contact|privacy|terms)/i,
      /\/(tag|category|archive|page|search)/i,
      /\/(login|signup|register|account|dashboard)/i,
      /\/(feed|rss|api|wp-json|wp-admin)/i,
      /\/#/,
      /\.(jpg|jpeg|png|gif|pdf|zip|xml)$/i,
      /^\/$/,
      /\/page\/\d+/i,
      /\?/
    ];

    if (nonArticlePatterns.some(pattern => pattern.test(pathname))) {
      return false;
    }

    const articlePatterns = [
      /\/\d{4}\/\d{2}\/\d{2}\//,
      /\/blog\//,
      /\/post\//,
      /\/article\//,
      /\/[^\/]+\/?$/
    ];

    return articlePatterns.some(pattern => pattern.test(pathname));
  } catch (error) {
    return false;
  }
}

/**
 * Common selectors for pagination "Next" buttons
 */
const NEXT_PAGE_SELECTORS = [
  'a.next',
  'a[rel="next"]',
  'a[aria-label*="next" i]',
  'a.pagination__next',
  'a.pagination-next',
  'a[class*="next" i]',
  'link[rel="next"]',
  '.pagination a:last-child',
  'button[aria-label*="next" i]'
];

/**
 * Extract article links from the current page
 * @param page - Puppeteer page instance
 * @param baseUrl - The base URL for reference
 * @returns Array of article URLs found on the current page
 */
async function extractArticleLinksFromPage(page: Page, baseUrl: string): Promise<string[]> {
  const links = await page.evaluate(() => {
    const anchorElements = Array.from(document.querySelectorAll('a[href]'));
    return anchorElements
      .map(anchor => (anchor as HTMLAnchorElement).href)
      .filter(href => href && href.trim() !== '');
  });

  return links
    .filter(href => isArticleLink(href, baseUrl))
    .map(href => {
      try {
        const url = new URL(href);
        url.hash = '';
        return url.toString();
      } catch {
        return href;
      }
    });
}

/**
 * Attempt to find and navigate to the next page
 * @param page - Puppeteer page instance
 * @returns The next page URL if found, null otherwise
 */
/**
 * Find a "Next" pagination link by anchor text (Playwright-style :has-text is not valid in querySelector).
 */
async function findNextPageUrlByAnchorText(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    for (const a of anchors) {
      const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/^next\b/i.test(text) || text.length > 40) {
        continue;
      }
      const href = a.href;
      if (href) {
        return href;
      }
    }
    return null;
  });
}

async function findNextPageUrl(page: Page): Promise<string | null> {
  for (const selector of NEXT_PAGE_SELECTORS) {
    try {
      const nextUrl = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (element && (element as HTMLAnchorElement).href) {
          return (element as HTMLAnchorElement).href;
        }
        return null;
      }, selector);

      if (nextUrl) {
        return nextUrl;
      }
    } catch {
      continue;
    }
  }

  return findNextPageUrlByAnchorText(page);
}

/**
 * Attempt infinite scroll to load more content
 * @param page - Puppeteer page instance
 * @returns Boolean indicating if new content was loaded
 */
async function attemptInfiniteScroll(page: Page): Promise<boolean> {
  const initialHeight = await page.evaluate(() => document.body.scrollHeight);
  
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  try {
    await page.waitForFunction(
      (prevHeight) => document.body.scrollHeight > prevHeight,
      { timeout: 3000 },
      initialHeight
    );
    
    await page.waitForNetworkIdle({ timeout: 2000 }).catch(() => {});
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all article links from a base URL
 * @param baseUrl - The blog's base URL to scrape
 * @param maxPages - Maximum number of pages to scrape (default: 5)
 * @returns Promise containing an array of unique article URLs
 */
export async function getArticleLinks(baseUrl: string, maxPages: number = 5): Promise<string[]> {
  let browser: Browser | null = null;
  
  try {
    // @ts-ignore - puppeteer-extra is compatible with puppeteer API
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const page: Page = await browser!.newPage();
    
    await setupRequestInterception(page);
    
    await page.setUserAgent(REALISTIC_USER_AGENT);

    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const allArticleLinks = new Set<string>();
    let currentPage = 1;
    let visitedUrls = new Set<string>([baseUrl]);

    while (currentPage <= maxPages) {
      const pageLinks = await extractArticleLinksFromPage(page, baseUrl);
      
      pageLinks.forEach(link => allArticleLinks.add(link));

      if (currentPage >= maxPages) {
        break;
      }

      const nextPageUrl = await findNextPageUrl(page);

      if (nextPageUrl && !visitedUrls.has(nextPageUrl)) {
        try {
          visitedUrls.add(nextPageUrl);
          await page.goto(nextPageUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          currentPage++;
          continue;
        } catch (error) {
          console.warn(`Failed to navigate to next page: ${nextPageUrl}`);
          break;
        }
      }

      const previousCount = allArticleLinks.size;
      const scrollSuccessful = await attemptInfiniteScroll(page);
      
      if (scrollSuccessful) {
        const newLinks = await extractArticleLinksFromPage(page, baseUrl);
        newLinks.forEach(link => allArticleLinks.add(link));
        
        if (allArticleLinks.size === previousCount) {
          break;
        }
        currentPage++;
      } else {
        break;
      }
    }

    return Array.from(allArticleLinks);
  } catch (error) {
    throw new Error(`Failed to get article links: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Crawls a URL and returns the HTML content
 * @param url - The target URL to crawl
 * @returns Promise containing the HTML content as a string
 */
export async function crawl(url: string): Promise<string> {
  let browser: Browser | null = null;
  
  try {
    // @ts-ignore - puppeteer-extra is compatible with puppeteer API
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const page: Page = await browser!.newPage();
    
    await setupRequestInterception(page);
    
    await page.setUserAgent(REALISTIC_USER_AGENT);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const html = await page.content();

    return html;
  } catch (error) {
    throw new Error(`Failed to crawl URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
