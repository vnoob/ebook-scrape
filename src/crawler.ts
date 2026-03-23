import puppeteer, { Browser, Page } from 'puppeteer';

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
 * Get all article links from a base URL
 * @param baseUrl - The blog's base URL to scrape
 * @returns Promise containing an array of unique article URLs
 */
export async function getArticleLinks(baseUrl: string): Promise<string[]> {
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page: Page = await browser.newPage();
    
    await setupRequestInterception(page);
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const links = await page.evaluate(() => {
      const anchorElements = Array.from(document.querySelectorAll('a[href]'));
      return anchorElements
        .map(anchor => (anchor as HTMLAnchorElement).href)
        .filter(href => href && href.trim() !== '');
    });

    const articleLinks = links
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

    const uniqueLinks = Array.from(new Set(articleLinks));

    return uniqueLinks;
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
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();
    
    await setupRequestInterception(page);
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

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
