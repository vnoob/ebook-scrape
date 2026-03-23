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
├── package.json          # Project configuration and dependencies
├── tsconfig.json         # TypeScript configuration
├── .gitignore           # Git ignore rules
├── README.md            # This file
└── src/
    ├── index.ts         # CLI entry point with commander
    ├── crawler.ts       # Web crawling logic with Puppeteer
    ├── extractor.ts     # Content extraction with Readability
    ├── generator.ts     # PDF generation (skeleton - needs implementation)
    └── test-crawler.ts  # Test script for article link extraction
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

## Implementation Status

### Completed
- ✅ Project structure and configuration
- ✅ CLI interface with commander
- ✅ Loading spinners with ora
- ✅ Web crawler with Puppeteer and request interception
- ✅ Article link discovery with smart filtering
- ✅ Content extractor with Readability and jsdom

### To Do
- ⚠️ **PDF generation implementation**: The `src/generator.ts` file currently contains a skeleton. You need to implement the actual PDF generation logic using one of these libraries:
  - Puppeteer's `page.pdf()` method
  - pdfkit
  - html-pdf-node

## Next Steps

1. Install Node.js (if not already installed)
2. Run `npm install` to install all dependencies
3. Implement the PDF generation logic in `src/generator.ts`
4. Build and test the application

## License

ISC
