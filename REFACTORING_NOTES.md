# Content Extraction Refactoring - Whitespace Improvements

## Summary
Refactored the article extraction and generation code to significantly reduce excessive whitespace in exported PDF and EPUB files.

## Changes Made

### 1. Enhanced HTML Cleaning in `extractor.ts`

#### New `cleanHTMLWhitespace()` Function
Normalizes whitespace in HTML content:
- Removes excessive blank lines (3+ consecutive newlines → 2)
- Strips trailing spaces on lines
- Strips leading spaces on lines
- Collapses multiple consecutive spaces into single space
- Trims content

#### New `removeUnwantedElements()` Function
Removes non-content elements that add clutter:
- Scripts, styles, iframes
- Advertisements and social share buttons
- Comments sections and related posts
- Navigation, headers, footers (except within articles)
- Sidebars and empty elements

#### Enhanced `convertRelativeUrlsToAbsolute()` Function
Now includes:
- HTML cleaning and unwanted element removal
- Removal of `srcset` and `loading` attributes from images
- Whitespace normalization

### 2. Optimized HTML Templates in `generator.ts`

#### Minimized Template Whitespace
- Removed excessive indentation from CSS and HTML templates
- Changed from multi-line template strings to compact format
- Reduced file size and improved readability

#### New CSS Rules for Whitespace Control
Added CSS to hide empty elements:
```css
.chapter p:empty { display: none; }
.chapter br + br { display: none; }
.chapter div:empty, .chapter span:empty { display: none; }
```

#### Improved Spacing
- Reduced paragraph margins (1rem → 0.75rem)
- Better line-height for paragraphs (1.7)
- Optimized list item spacing (0.5rem → 0.3rem)
- Centered images with `margin: auto`

#### New `cleanArticleContent()` Function for EPUB
Specifically cleans content before EPUB generation:
- Removes excessive line breaks
- Collapses multiple `<br>` tags
- Removes empty `<p>` and `<div>` tags

## Benefits

### Before
- Large amounts of whitespace in exported files
- Multiple consecutive blank lines
- Empty paragraphs and divs
- Cluttered with ads, social buttons, navigation
- Large file sizes

### After
- Clean, compact content
- Normalized spacing between elements
- Only article content included
- Smaller file sizes
- Better reading experience

## Testing

Test files generated with improvements:
- `stocks-invests-clean.pdf` - 3 articles
- `stocks-invests-clean.epub` - 5 articles

Compare these with previous exports to see the difference in whitespace handling.

## Technical Details

### Whitespace Normalization Patterns
```javascript
.replace(/\n\s*\n\s*\n/g, '\n\n')      // Max 2 consecutive newlines
.replace(/[ \t]+\n/g, '\n')            // Remove trailing whitespace
.replace(/\n[ \t]+/g, '\n')            // Remove leading whitespace
.replace(/[ \t]{2,}/g, ' ')            // Collapse multiple spaces
.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>') // Single line breaks
```

### Elements Removed
- Advertisement containers (`.ad`, `.advertisement`)
- Social sharing widgets (`[class*="share"]`, `[class*="social"]`)
- Navigation elements (`nav`, `header`, `footer`)
- Comment sections (`[id*="comments"]`, `.comments`)
- Related content (`.related-posts`)
- Newsletter signups (`.newsletter-signup`)

## Future Improvements

Potential enhancements:
1. Add configurable whitespace normalization levels
2. Allow users to specify custom CSS
3. Add option to keep or remove specific elements
4. Implement content sanitization settings
5. Add image optimization/compression

## Usage

The refactoring is transparent to users. Simply run the tool as before:

```bash
# PDF with improved whitespace handling
./build/ebook-scape-win.exe --url https://example.com/archive --out output.pdf --format pdf

# EPUB with improved whitespace handling
./build/ebook-scape-win.exe --url https://example.com/archive --out output.epub --format epub
```

No configuration changes needed - all improvements are applied automatically!
