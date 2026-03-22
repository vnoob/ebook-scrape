import puppeteer, { Browser, Page } from 'puppeteer';

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
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
