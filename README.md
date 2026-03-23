# ebook-scape

Convert blog posts to PDF eBooks using a simple CLI tool.

## Prerequisites

Before you can use this project, you need to have Node.js and npm installed on your system.

### Installing Node.js

1. Download Node.js from [https://nodejs.org/](https://nodejs.org/) (LTS version recommended)
2. Run the installer and follow the installation wizard
3. Verify installation by opening a new terminal and running:
   ```bash
   node --version
   npm --version
   ```

## Installation

Once Node.js is installed, run the following command in the project directory to install dependencies:

```bash
npm install
```

This will install all required dependencies:
- **commander**: CLI framework for parsing arguments
- **ora**: Loading spinner for CLI feedback
- **puppeteer**: Headless browser for web crawling
- **@mozilla/readability**: Extract readable content from HTML
- **jsdom**: DOM implementation for Node.js
- **epub-gen-memory**: EPUB eBook generation library

## Development

Build the TypeScript code:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev -- --url <URL> --out <OUTPUT_PATH>
```

## Usage

After building the project, you can use the CLI tool:

```bash
npm start -- --url <URL> --out <OUTPUT_PATH>
```

Or if installed globally:

```bash
ebook-scape --url <URL> --out <OUTPUT_PATH>
```

### Options

- `-u, --url <url>`: Target blog URL to scrape (required)
- `-o, --out <path>`: Output PDF file path (required)
- `-h, --help`: Display help for command
- `-V, --version`: Output version number

### Example

```bash
npm start -- --url https://example.com/blog-post --out output.pdf
```

## Project Structure

```
ebook-scape/
├── package.json               # Project configuration and dependencies
├── tsconfig.json              # TypeScript configuration
├── .gitignore                # Git ignore rules
├── README.md                 # This file
└── src/
    ├── index.ts              # CLI entry point with commander
    ├── crawler.ts            # Web crawling logic with Puppeteer
    ├── extractor.ts          # Content extraction with Readability
    ├── generator.ts          # PDF & EPUB generation
    ├── test-crawler.ts       # Test script for article link extraction
    ├── test-extractor.ts     # Test script for content extraction
    ├── test-generator.ts     # Test script for PDF generation
    ├── test-epub-generator.ts # Test script for EPUB generation
    ├── test-full-workflow.ts # Test script for complete workflow
    ├── test-complete-workflow.ts # Integration test (PDF only)
    └── test-both-formats.ts  # Integration test (PDF & EPUB)
```

## Features

### 🚀 Optimized Web Crawling

The crawler module includes advanced features for efficient scraping:

- **Request Interception**: Automatically blocks unnecessary resources (images, fonts, stylesheets, tracking scripts) to speed up crawling by up to 80%
- **Smart Link Filtering**: Identifies and extracts only article URLs, filtering out:
  - Author profiles and user pages
  - Tag and category pages
  - Archive and pagination links
  - Login, signup, and admin pages
  - Feed and API endpoints
- **Duplicate Prevention**: Returns only unique article URLs
- **Cross-domain Protection**: Only returns links from the same domain as the base URL

### 📖 Article Link Discovery

Use the `getArticleLinks()` function to discover all article URLs from a blog:

```typescript
import { getArticleLinks } from './crawler.js';

const articles = await getArticleLinks('https://example.com/blog');
console.log(`Found ${articles.length} articles`);
```

Test it from the command line:

```bash
npm run build
node dist/test-crawler.js https://example.com/blog
```

### 📝 Content Extraction

Use the `extractContent()` function to extract clean article content from multiple URLs:

```typescript
import { extractContent } from './extractor.js';

const urls = ['https://example.com/article1', 'https://example.com/article2'];
const articles = await extractContent(urls);

articles.forEach(article => {
  console.log(`Title: ${article.title}`);
  console.log(`Content: ${article.contentHTML}`);
});
```

Features:
- **Lazy-loaded Image Support**: Automatically scrolls the page to trigger lazy-loading
- **Network Idle Wait**: Uses `networkidle0` to ensure all content is fully loaded
- **Readability Parsing**: Strips out headers, footers, sidebars, and ads
- **Absolute URL Conversion**: Converts all relative image and link URLs to absolute URLs
- **Error Resilience**: Continues processing remaining URLs even if one fails

Test it from the command line:

```bash
npm run build
node dist/test-extractor.js https://example.com/article1 https://example.com/article2
```

### 📄 PDF Generation

Use the `buildPDF()` function to generate a professional PDF eBook with Table of Contents:

```typescript
import { buildPDF } from './generator.js';

const articles = [
  { title: 'Article 1', contentHTML: '<p>Content...</p>' },
  { title: 'Article 2', contentHTML: '<p>More content...</p>' }
];

await buildPDF(articles, 'output/my-ebook.pdf');
```

Features:
- **Table of Contents**: Automatically generated with clickable links to each chapter
- **Page Breaks**: Each article starts on a fresh page
- **Professional Styling**: Clean, readable formatting with proper typography
- **A4 Format**: Standard paper size with appropriate margins
- **Page Numbers**: Footer with current page and total pages
- **Internal Links**: TOC links work correctly in the PDF

Test it from the command line:

```bash
npm run build
node dist/test-generator.js output/test-ebook.pdf
```

### 📚 EPUB Generation

Use the `buildEPUB()` function to generate an EPUB eBook compatible with e-readers:

```typescript
import { buildEPUB } from './generator.js';

const articles = [
  { title: 'Article 1', contentHTML: '<p>Content...</p>' },
  { title: 'Article 2', contentHTML: '<p>More content...</p>' }
];

await buildEPUB(articles, 'output/my-ebook.epub', 'My Blog Collection');
```

Features:
- **Standard EPUB Format**: Compatible with Kindle, Apple Books, Google Play Books, and all EPUB readers
- **Automatic Chapters**: Each article becomes a separate chapter
- **Table of Contents**: Built-in navigation in e-reader apps
- **Metadata**: Customizable book title and author
- **Reflowable Text**: Adapts to any screen size

Test it from the command line:

```bash
npm run build
node dist/test-epub-generator.js output/test-ebook.epub "My Sample Book"
```

### 🔄 Complete Workflow

Run the entire workflow from discovery to eBook generation:

**PDF only:**
```bash
npm run build
node dist/test-complete-workflow.js https://example.com/blog output/my-ebook.pdf 5
```

**Both PDF and EPUB:**
```bash
npm run build
node dist/test-both-formats.js https://example.com/blog output 5
```

This will:
1. Discover all article URLs from the blog
2. Extract content from the first 5 articles
3. Generate both PDF and EPUB eBooks
2. Extract content from the first 5 articles
3. Generate a PDF with Table of Contents

## Implementation Status

### Completed
- ✅ Project structure and configuration
- ✅ CLI interface with commander
- ✅ Loading spinners with ora
- ✅ Web crawler with Puppeteer and request interception
- ✅ Article link discovery with smart filtering
- ✅ Content extractor with Readability and jsdom
- ✅ Batch content extraction with lazy-loading support
- ✅ Relative to absolute URL conversion
- ✅ PDF generation with Table of Contents
- ✅ Professional PDF styling and formatting
- ✅ EPUB generation with chapter support
- ✅ Complete end-to-end workflow (PDF & EPUB)

## License

ISC
