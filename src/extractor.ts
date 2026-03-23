import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import puppeteer, { Browser, Page } from 'puppeteer';
import { getPuppeteerLaunchOptions } from './browser-utils.js';

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
 * Convert relative URLs to absolute URLs in HTML content
 * @param html - HTML content
 * @param baseUrl - Base URL for resolving relative paths
 * @returns HTML with absolute URLs
 */
function convertRelativeUrlsToAbsolute(html: string, baseUrl: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const images = document.querySelectorAll('img[src]');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href;
        img.setAttribute('src', absoluteUrl);
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

  return document.body.innerHTML;
}

/**
 * Extract content from multiple URLs using Puppeteer and Readability
 * @param urls - Array of URLs to extract content from
 * @returns Promise containing array of extracted article content
 */
export async function extractContent(urls: string[]): Promise<ArticleContent[]> {
  let browser: Browser | null = null;
  const results: ArticleContent[] = [];

  try {
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    for (const url of urls) {
      try {
        const page: Page = await browser.newPage();

        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 60000
        });

        await autoScrollPage(page);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const html = await page.content();

        await page.close();

        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
          console.warn(`Failed to parse article from: ${url}`);
          continue;
        }

        const contentWithAbsoluteUrls = convertRelativeUrlsToAbsolute(article.content, url);

        results.push({
          title: article.title,
          contentHTML: contentWithAbsoluteUrls
        });

        console.log(`✓ Extracted: ${article.title}`);
      } catch (error) {
        console.error(`Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
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

    const reader = new Readability(dom.window.document);
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
