import { describe, it, expect } from 'vitest';
import {
  isUnsafeHref,
  looksLikeLoadMoreButtonText
} from '../src/lazy-loader.js';

describe('isUnsafeHref', () => {
  it('returns false for null or empty href', () => {
    expect(isUnsafeHref(null)).toBe(false);
    expect(isUnsafeHref('')).toBe(false);
  });

  it('returns true for javascript, data, and vbscript schemes', () => {
    expect(isUnsafeHref('javascript:alert(1)')).toBe(true);
    expect(isUnsafeHref('JavaScript:void(0)')).toBe(true);
    expect(isUnsafeHref('data:text/html,<html>')).toBe(true);
    expect(isUnsafeHref('vbscript:msgbox(1)')).toBe(true);
  });

  it('returns false for https and relative hrefs', () => {
    expect(isUnsafeHref('https://example.com/more')).toBe(false);
    expect(isUnsafeHref('/page/2')).toBe(false);
    expect(isUnsafeHref('#section')).toBe(false);
  });
});

describe('looksLikeLoadMoreButtonText', () => {
  it('matches load-more style labels', () => {
    expect(looksLikeLoadMoreButtonText('Load more')).toBe(true);
    expect(looksLikeLoadMoreButtonText('Show all')).toBe(true);
    expect(looksLikeLoadMoreButtonText('See More')).toBe(true);
  });

  it('rejects bare read more (navigation)', () => {
    expect(looksLikeLoadMoreButtonText('Read more')).toBe(false);
    expect(looksLikeLoadMoreButtonText('read more')).toBe(false);
  });

  it('rejects overly long strings', () => {
    expect(looksLikeLoadMoreButtonText('a'.repeat(100))).toBe(false);
  });
});
