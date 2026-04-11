import type { Page } from 'puppeteer-core';
import { NON_CONTENT_SELECTORS } from './non-content-selectors.js';

const LOAD_MORE_TEXT =
  /\b(load more|show more|show all|expand|see more|view all)\b/i;

/** Skip standalone "read more" links (usually navigate away). */
const READ_MORE_ONLY = /^read more\b/i;

export interface LazyLoadOptions {
  /** Max time for lazy loading (default: 20000ms). */
  totalTimeout?: number;
  /** Pause after each scroll step (default: 500ms). */
  scrollPauseMs?: number;
  /** Max mutations allowed in {@link stabilityWindow} to count as stable (default: 5). */
  stabilityThreshold?: number;
  /** Time window (ms) for stability check (default: 1000). */
  stabilityWindow?: number;
  /** Max full scroll cycles (default: 3). */
  maxScrollPasses?: number;
  /** Click "Load more" style controls (default: true). */
  clickLoadMore?: boolean;
  /** Progress phases for CLI / callers (e.g. spinner text). */
  onProgress?: (phase: string) => void;
}

/**
 * Returns true if an anchor href must not be followed for load-more clicks.
 * @param href - Raw href or null for non-anchors
 * @returns Whether the scheme is unsafe
 */
export function isUnsafeHref(href: string | null): boolean {
  if (href == null || href === '') {
    return false;
  }
  return /^(javascript|data|vbscript):/i.test(href.trim());
}

/**
 * Whether visible text looks like a load-more control (and is not a bare "read more").
 * @param text - Normalized visible text
 * @returns True if this matches load-more patterns
 */
export function looksLikeLoadMoreButtonText(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 80) {
    return false;
  }
  if (READ_MORE_ONLY.test(t) && !LOAD_MORE_TEXT.test(t)) {
    return false;
  }
  return LOAD_MORE_TEXT.test(t);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Remove non-content elements from the live page DOM (runs in browser context).
 * Uses the shared `NON_CONTENT_SELECTORS` list from `non-content-selectors.ts`.
 * @param page - Puppeteer page instance
 * @returns Approximate number of elements removed
 */
export async function stripNonContentElements(page: Page): Promise<number> {
  const selectors = [...NON_CONTENT_SELECTORS];
  return page.evaluate((sels: string[]) => {
    let count = 0;
    for (const sel of sels) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          el.remove();
          count++;
        });
      } catch {
        // Ignore invalid selectors for the current document
      }
    }
    return count;
  }, selectors);
}

/**
 * Promote lazy image attributes to real src/srcset and drop native lazy loading hints.
 * @param page - Puppeteer page instance
 * @returns Number of images touched
 */
export async function revealLazyImages(page: Page): Promise<number> {
  return page.evaluate(() => {
    let n = 0;
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img) => {
      const lazyAttrs = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy'] as const;
      for (const attr of lazyAttrs) {
        const v = img.getAttribute(attr);
        if (v && !img.getAttribute('src')) {
          img.setAttribute('src', v);
          n++;
          break;
        }
      }
      const dataSrcset = img.getAttribute('data-srcset');
      if (dataSrcset) {
        img.setAttribute('srcset', dataSrcset);
        n++;
      }
      if (img.hasAttribute('loading')) {
        img.removeAttribute('loading');
        n++;
      }
    });
    return n;
  });
}

/**
 * Wait until DOM mutations in a sliding window stay at or below a threshold, or until timeout.
 * @param page - Puppeteer page
 * @param threshold - Max mutations in the last windowMs to treat as stable
 * @param windowMs - Sliding window size in ms
 * @param timeoutMs - Max wait before returning false
 * @returns True if stable before timeout, false if timed out while still noisy
 */
export async function waitForStableDOM(
  page: Page,
  threshold: number,
  windowMs: number,
  timeoutMs: number
): Promise<boolean> {
  if (timeoutMs <= 0) {
    return false;
  }
  return page.evaluate(
    async (args: { threshold: number; windowMs: number; timeoutMs: number }) => {
      const { threshold: th, windowMs: win, timeoutMs: max } = args;
      return await new Promise<boolean>((resolve) => {
        const timestamps: number[] = [];
        const observer = new MutationObserver(() => {
          timestamps.push(Date.now());
        });
        observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true
        });

        const deadline = Date.now() + max;
        const tick = (): void => {
          const now = Date.now();
          const cutoff = now - win;
          while (timestamps.length > 0 && timestamps[0]! < cutoff) {
            timestamps.shift();
          }
          const count = timestamps.length;
          if (count <= th) {
            observer.disconnect();
            resolve(true);
            return;
          }
          if (now >= deadline) {
            observer.disconnect();
            resolve(false);
            return;
          }
          setTimeout(tick, Math.min(100, Math.max(25, win / 4)));
        };
        setTimeout(tick, Math.min(200, win));
      });
    },
    { threshold, windowMs, timeoutMs }
  );
}

/**
 * Scroll the page in viewport steps, waiting for DOM stability after each step.
 * @param page - Puppeteer page
 * @param options - Scroll and stability tuning
 * @returns Resolves when scrolling finishes or the deadline is reached
 */
export async function scrollWithStability(
  page: Page,
  options?: Pick<LazyLoadOptions, 'scrollPauseMs' | 'maxScrollPasses' | 'onProgress'> & {
    stabilityThreshold?: number;
    stabilityWindow?: number;
    stabilityTimeoutMs?: number;
    deadlineMs?: number;
  }
): Promise<void> {
  const scrollPauseMs = options?.scrollPauseMs ?? 500;
  const maxSteps = Math.max(1, options?.maxScrollPasses ?? 3) * 20;
  const stabilityThreshold = options?.stabilityThreshold ?? 5;
  const stabilityWindow = options?.stabilityWindow ?? 1000;
  const stabilityTimeoutMs = options?.stabilityTimeoutMs ?? 8000;
  const deadlineMs = options?.deadlineMs;

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(scrollPauseMs);

  let steps = 0;
  while (steps < maxSteps) {
    if (deadlineMs !== undefined && Date.now() >= deadlineMs) {
      break;
    }
    const atBottom = await page.evaluate(() => {
      const vh = window.innerHeight || 600;
      const y = window.scrollY;
      const sh = Math.max(
        document.body?.scrollHeight ?? 0,
        document.documentElement?.scrollHeight ?? 0
      );
      if (y + vh >= sh - 4) {
        return true;
      }
      window.scrollBy(0, vh);
      return false;
    });

    const stabBudget =
      deadlineMs !== undefined ? Math.max(100, deadlineMs - Date.now()) : stabilityTimeoutMs;
    await waitForStableDOM(page, stabilityThreshold, stabilityWindow, Math.min(stabilityTimeoutMs, stabBudget));
    await sleep(scrollPauseMs);
    steps++;
    if (atBottom) {
      break;
    }
  }
}

/**
 * Click at most one load-more control per call inside main/article content; repeat via caller.
 * @param page - Puppeteer page
 * @returns 1 if a control was clicked, 0 otherwise
 */
export async function clickOneLoadMoreButton(page: Page): Promise<number> {
  const urlBefore = page.url();
  const clicked = await page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll('article, main, [role="main"], .content')
    ) as Element[];
    const searchRoots = roots.length > 0 ? roots : [document.body];
    const label = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();

    const matchesLoadMore = (text: string): boolean => {
      const t = text;
      if (!t || t.length > 80) {
        return false;
      }
      if (/^read more\b/i.test(t) && !/\b(load more|show more|show all|expand|see more|view all)\b/i.test(t)) {
        return false;
      }
      return /\b(load more|show more|show all|expand|see more|view all)\b/i.test(t);
    };

    const tryClick = (el: Element): boolean => {
      if (el instanceof HTMLAnchorElement) {
        const href = el.getAttribute('href');
        if (href && /^(javascript|data|vbscript):/i.test(href.trim())) {
          return false;
        }
      }
      const clickable = el as HTMLElement;
      clickable.click();
      return true;
    };

    for (const root of searchRoots) {
      const selectors = [
        '[data-action="load-more"]',
        '.load-more',
        '.show-more',
        'button.expand',
        'button',
        'a[href]',
        '[role="button"]'
      ];
      for (const sel of selectors) {
        const nodes = root.querySelectorAll(sel);
        for (const node of nodes) {
          const text = label(node);
          if (!matchesLoadMore(text)) {
            continue;
          }
          if (tryClick(node)) {
            return 1;
          }
        }
      }
    }
    return 0;
  });

  if (!clicked) {
    return 0;
  }

  await sleep(500);
  if (page.url() !== urlBefore) {
    await page.goBack({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
    return 0;
  }
  return 1;
}

/**
 * Click load-more controls until none match or safety aborts.
 * @param page - Puppeteer page
 * @param maxClicks - Upper bound on clicks
 * @returns Total successful clicks
 */
export async function clickLoadMoreButtons(page: Page, maxClicks: number = 5): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxClicks; i++) {
    const n = await clickOneLoadMoreButton(page);
    if (n === 0) {
      break;
    }
    total += n;
  }
  return total;
}

/**
 * Strip non-content regions, reveal lazy images, scroll with stability waits, and optionally click load-more controls.
 * On timeout or errors, leaves the page as-is; does not throw to callers.
 * @param page - Puppeteer page instance
 * @param options - Lazy-load tuning and progress callback
 * @returns Resolves when the expansion budget is exhausted or work completes
 */
export async function expandLazyContent(page: Page, options?: LazyLoadOptions): Promise<void> {
  const totalTimeout = options?.totalTimeout ?? 20000;
  const scrollPauseMs = options?.scrollPauseMs ?? 500;
  const stabilityThreshold = options?.stabilityThreshold ?? 5;
  const stabilityWindow = options?.stabilityWindow ?? 1000;
  const maxScrollPasses = options?.maxScrollPasses ?? 3;
  const clickLoadMore = options?.clickLoadMore !== false;
  const onProgress = options?.onProgress;

  const deadline = Date.now() + totalTimeout;

  const remainingMs = (): number => Math.max(0, deadline - Date.now());

  try {
    onProgress?.('strip');
    await stripNonContentElements(page);

    onProgress?.('images');
    await revealLazyImages(page);

    for (let cycle = 0; cycle < maxScrollPasses; cycle++) {
      if (remainingMs() < 150) {
        break;
      }
      onProgress?.('scroll');
      await scrollWithStability(page, {
        scrollPauseMs,
        maxScrollPasses,
        stabilityThreshold,
        stabilityWindow,
        stabilityTimeoutMs: Math.min(8000, remainingMs()),
        deadlineMs: deadline,
        onProgress
      });

      if (clickLoadMore && remainingMs() > 300) {
        onProgress?.('load-more');
        const clicks = await clickLoadMoreButtons(page, 5);
        if (clicks > 0) {
          cycle = -1;
          continue;
        }
      }
    }

    if (remainingMs() > 0) {
      await waitForStableDOM(
        page,
        stabilityThreshold,
        stabilityWindow,
        Math.min(2000, remainingMs())
      );
    }
  } catch (err) {
    console.debug(
      `expandLazyContent: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
