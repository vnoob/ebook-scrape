/**
 * Selectors for peripheral / non-article DOM removed before Readability and during in-browser lazy-load stripping.
 * Shared by extractor (JSDOM) and lazy-loader (live page).
 */
export const NON_CONTENT_SELECTORS: readonly string[] = [
  // Scripts and styles
  'script',
  'style',
  'noscript',

  // Ads
  '.ad',
  '.advertisement',
  '[class*="advert"]',

  // Social sharing (narrowed to avoid false positives like "Shakespeare")
  '.social-share',
  '.share-buttons',
  '.share-icons',
  '[class*="social-"]',

  // Comment sections (hyphenated wildcard avoids "commentary")
  '#comments',
  '.comments',
  '.comment-section',
  '.comment-list',
  '.comment-thread',
  '.comment-form',
  '[id*="comment"]',
  '[class*="comment-"]',

  // Disqus
  '#disqus_thread',
  '.disqus-comments',

  // WordPress comments
  '#respond',
  '.wp-comments-area',
  '.post-comments',

  // Discussion sections
  '.discussion',
  '.discussions',
  '[class*="discussion"]',

  // Related/recommended content
  '.related-posts',
  '.related-articles',
  '.recommended',
  '.recommendations',
  '[class*="related-"]',
  '.read-more',
  '.more-articles',
  '.you-may-like',
  '.also-read',

  // Newsletter signups
  '.newsletter-signup',
  '.newsletter',
  '.subscribe',
  '[class*="newsletter"]',
  '[class*="subscribe"]',

  // Navigation and layout
  'nav',
  'footer:not(.chapter footer)',
  'header:not(.chapter header)',
  '.sidebar',
  'aside',

  // Cookie banners and popups
  '.cookie-banner',
  '.cookie-consent',
  '[class*="cookie"]',
  '.popup',
  '.modal',
  '.overlay'
] as const;
