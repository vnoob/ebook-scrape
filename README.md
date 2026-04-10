# ebook-scape

> 📚 A powerful CLI tool to convert blog posts into beautiful PDF and EPUB eBooks

Transform any blog or website into professional eBooks with automatic content discovery, intelligent extraction, and beautiful formatting.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](LICENSE)

## ✨ Features

- 🔍 **Smart Article Discovery** - Automatically finds all article links from blog pages
- 📖 **Clean Content Extraction** - Uses Mozilla Readability to extract main content
- 📄 **Professional PDF Generation** - Creates PDFs with clickable Table of Contents
- 📚 **EPUB eBook Support** - Generates EPUB files for e-readers and tablets
- ⚡ **Optimized Performance** - Request interception blocks unnecessary resources (80% faster)
- 🎨 **Beautiful Formatting** - Professional typography and styling
- 🖥️ **Cross-Platform** - Standalone executables for Linux, Windows, and macOS
- 🌐 **Browser Detection** - Uses system Chrome/Edge for smaller, faster executables

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Command Line Options](#command-line-options)
  - [Examples](#examples)
  - [Standalone Executables](#standalone-executables)
- [Features In-Depth](#features-in-depth)
- [Development](#development)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Building Executables](#building-executables)
- [How It Works](#how-it-works)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Installation

### Prerequisites

- **Node.js** 20 or higher ([Download](https://nodejs.org/)) — required by dependencies (e.g. `p-limit` 7.x)
- **Chrome, Edge, or Chromium** browser installed (for standalone executables)

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## ⚡ Quick Start

Convert a blog to PDF:

```bash
npm start -- --url https://example.com/blog --out my-ebook.pdf
```

Convert a blog to EPUB:

```bash
npm start -- --url https://example.com/blog --out my-ebook.epub --format epub
```

Process 20 articles:

```bash
npm start -- --url https://example.com/blog --out my-ebook.pdf --max 20
```

## 📖 Usage

### Command Line Options

| Option | Alias | Description | Default | Required |
|--------|-------|-------------|---------|----------|
| `--url <url>` | `-u` | Target blog URL to scrape | - | ✅ |
| `--out <path>` | `-o` | Output eBook file path | - | ✅ |
| `--format <type>` | `-f` | Output format: `pdf` or `epub` | `pdf` | ❌ |
| `--max <number>` | `-m` | Maximum articles to process | `10` | ❌ |
| `--layout-mode <mode>` | `-l` | Layout mode: `static` or `ai` (PDF-only in v1) | `static` | ❌ |
| `--ai-provider <provider>` | - | AI provider: `gemini`, `openai`, `anthropic` | `gemini` | ❌ |
| `--ai-model <model>` | - | AI model override for provider | Provider default | ❌ |
| `--ai-api-key <key>` | - | API key for selected AI provider | Env var | ❌ |
| `--strip-links` | - | Strip non-anchor links and keep plain link text only | `false` | ❌ |
| `--no-cache` | - | Skip cached AI CSS and force fresh generation | false | ❌ |
| `--help` | `-h` | Display help information | - | ❌ |
| `--version` | `-V` | Display version number | - | ❌ |

### Examples

**Basic PDF Generation:**
```bash
npm start -- --url https://blog.example.com --out output.pdf
```

**EPUB for E-Readers:**
```bash
npm start -- --url https://blog.example.com --out book.epub --format epub
```

**Process All Articles:**
```bash
npm start -- --url https://blog.example.com --out complete.pdf --max 100
```

**AI-Assisted PDF Layout Selection (AI-generated CSS):**
```bash
npm start -- --url https://blog.example.com --out output.pdf --layout-mode ai
```

**Choose provider + model:**
```bash
npm start -- --url https://blog.example.com --out output.pdf --layout-mode ai --ai-provider openai --ai-model gpt-4o-mini
```

**Provide API key directly and skip cache:**
```bash
npm start -- --url https://blog.example.com --out output.pdf --layout-mode ai --ai-provider gemini --ai-api-key YOUR_KEY --no-cache
```

**Strip external URLs from PDF/EPUB content:**
```bash
npm start -- --url https://blog.example.com --out clean.pdf --strip-links
```

**Important:** AI mode in v1 only applies to PDF output and generates CSS only (HTML structure/content are unchanged). If AI fails or returns invalid CSS, ebook-scape automatically falls back to static layout.

**Using with npx (no install):**
```bash
npx ebook-scape --url https://blog.example.com --out book.pdf
```

### Standalone Executables

Build standalone binaries (no Node.js required):

```bash
npm run build:exe
```

This creates executables in the `build/` directory:
- `ebook-scape-linux` (Linux x64)
- `ebook-scape-win.exe` (Windows x64)
- `ebook-scape-macos` (macOS x64)

**Run on Linux/macOS:**
```bash
./build/ebook-scape-linux --url https://blog.example.com --out book.pdf
```

**Run on Windows:**
```cmd
build\ebook-scape-win.exe --url https://blog.example.com --out book.epub --format epub
```

## 🎯 Features In-Depth

### 1. Smart Article Discovery

Automatically identifies article links while filtering out:
- ❌ Author profiles and user pages
- ❌ Tag and category pages
- ❌ Pagination and archive links
- ❌ Login/signup pages
- ❌ Admin panels and feeds
- ✅ Only real article content

### 2. Intelligent Content Extraction

- **Lazy-Loading Support**: Automatically scrolls pages to trigger lazy-loaded images
- **Network Idle Detection**: Waits for all resources to load (`networkidle0`)
- **Mozilla Readability**: Strips headers, footers, sidebars, and ads
- **URL Normalization**: Converts relative URLs to absolute paths
- **Error Resilience**: Continues even if some articles fail

### 3. Professional PDF Generation

- 📑 **Table of Contents**: Auto-generated with clickable chapter links
- 📄 **Page Management**: Each article starts on a new page
- 🎨 **Typography**: Beautiful fonts and spacing
- 📐 **A4 Format**: Standard paper size (210mm × 297mm)
- 📊 **Margins**: Professional 20mm top/bottom, 15mm sides
- 🔢 **Page Numbers**: Footer with current/total pages

### 4. EPUB eBook Support

- 📱 **Universal Format**: Works on Kindle, iPad, Android, Kobo, Nook
- 📖 **Chapter Navigation**: Each article is a separate chapter
- 🔖 **Table of Contents**: Built-in e-reader navigation
- 📝 **Metadata**: Custom title and author
- 📐 **Reflowable**: Adapts to any screen size

### 5. Performance Optimization

Request interception blocks:
- 🚫 Images (during discovery)
- 🚫 Stylesheets
- 🚫 Web fonts
- 🚫 Tracking scripts (Google Analytics, Facebook, etc.)
- 🚫 Ads and widgets

**Result**: Up to **80% faster** scraping!

### 6. Browser Detection

Automatically finds and uses local browser installations:

**Windows:**
- Google Chrome (Program Files, LocalAppData)
- Microsoft Edge (Program Files)
- Brave Browser

**macOS:**
- Google Chrome.app
- Microsoft Edge.app
- Brave Browser.app
- Chromium.app

**Linux:**
- google-chrome / google-chrome-stable
- chromium / chromium-browser
- microsoft-edge / microsoft-edge-stable
- brave-browser

**Fallback**: Uses bundled Chromium if no browser found.

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev -- --url <URL> --out <PATH>
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:exe` | Build standalone executables |
| `npm start` | Run the CLI tool |
| `npm run dev` | Run with ts-node (development) |

## 📁 Project Structure

```
ebook-scape/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Documentation
├── .gitignore                      # Git ignore rules
│
├── src/                            # Source code
│   ├── index.ts                    # CLI entry point
│   ├── crawler.ts                  # Article discovery & crawling
│   ├── extractor.ts                # Content extraction
│   ├── generator.ts                # PDF & EPUB generation
│   ├── browser-utils.ts            # Browser detection utilities
│   ├── chrome-paths.d.ts           # Type definitions
│   │
│   └── test-*.ts                   # Test scripts
│       ├── test-crawler.ts         # Test article discovery
│       ├── test-extractor.ts       # Test content extraction
│       ├── test-generator.ts       # Test PDF generation
│       ├── test-epub-generator.ts  # Test EPUB generation
│       ├── test-full-workflow.ts   # Test complete workflow
│       ├── test-complete-workflow.ts # PDF workflow test
│       └── test-both-formats.ts    # PDF & EPUB test
│
├── dist/                           # Compiled JavaScript (generated)
└── build/                          # Standalone executables (generated)
```

## 📚 API Documentation

### Crawler Module

#### `getArticleLinks(baseUrl: string): Promise<string[]>`

Discovers all article URLs from a blog page.

```typescript
import { getArticleLinks } from './crawler.js';

const articles = await getArticleLinks('https://blog.example.com');
console.log(`Found ${articles.length} articles`);
```

#### `crawl(url: string): Promise<string>`

Fetches HTML content from a single URL.

```typescript
import { crawl } from './crawler.js';

const html = await crawl('https://blog.example.com/article');
```

### Extractor Module

#### `extractContent(urls: string[], concurrencyLimit?: number, options?: ExtractionOptions): Promise<ArticleContent[]>`

Extracts clean content from multiple URLs.

```typescript
import { extractContent } from './extractor.js';

const urls = ['https://blog.example.com/post1', 'https://blog.example.com/post2'];
const articles = await extractContent(urls, 5, { stripLinks: true });

articles.forEach(article => {
  console.log(article.title);
  console.log(article.contentHTML);
});
```

**Returns:**
```typescript
interface ArticleContent {
  title: string;
  contentHTML: string;
}
```

### Generator Module

#### `buildPDF(articles: Article[], outputPath: string): Promise<void>`

Generates a PDF eBook with Table of Contents.

```typescript
import { buildPDF } from './generator.js';

const articles = [
  { title: 'Chapter 1', contentHTML: '<p>Content...</p>' },
  { title: 'Chapter 2', contentHTML: '<p>More content...</p>' }
];

await buildPDF(articles, 'output/book.pdf');
```

#### `buildEPUB(articles: Article[], outputPath: string, blogTitle: string): Promise<void>`

Generates an EPUB eBook.

```typescript
import { buildEPUB } from './generator.js';

const articles = [
  { title: 'Chapter 1', contentHTML: '<p>Content...</p>' },
  { title: 'Chapter 2', contentHTML: '<p>More content...</p>' }
];

await buildEPUB(articles, 'output/book.epub', 'My Blog Collection');
```

### Browser Utils Module

#### `findChromiumExecutable(): string | undefined`

Finds local Chrome/Edge/Chromium installation.

```typescript
import { findChromiumExecutable } from './browser-utils.js';

const browserPath = findChromiumExecutable();
if (browserPath) {
  console.log(`Found browser at: ${browserPath}`);
}
```

#### `getPuppeteerLaunchOptions(): object`

Returns Puppeteer configuration with browser path.

```typescript
import { getPuppeteerLaunchOptions } from './browser-utils.js';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch(getPuppeteerLaunchOptions());
```

## 🧪 Testing

### Test Individual Components

**Test Article Discovery:**
```bash
npm run build
node dist/test-crawler.js https://blog.example.com
```

**Test Content Extraction:**
```bash
node dist/test-extractor.js https://blog.example.com/post1 https://blog.example.com/post2
```

**Test PDF Generation:**
```bash
node dist/test-generator.js output/test.pdf
```

**Test EPUB Generation:**
```bash
node dist/test-epub-generator.js output/test.epub "Sample Book"
```

### Test Complete Workflows

**Full Workflow (PDF):**
```bash
node dist/test-complete-workflow.js https://blog.example.com output/book.pdf 5
```

**Both Formats:**
```bash
node dist/test-both-formats.js https://blog.example.com output 5
```

## 📦 Building Executables

### Build All Platforms

```bash
npm run build:exe
```

**Output:**
- `build/ebook-scape-linux` (58-72 MB)
- `build/ebook-scape-win.exe` (60-75 MB)
- `build/ebook-scape-macos` (65-80 MB)

### Configuration

Edit `package.json` to customize:

```json
{
  "pkg": {
    "scripts": "dist/**/*.js",
    "targets": [
      "node22-linux-x64",
      "node22-win-x64",
      "node22-macos-x64"
    ],
    "outputPath": "build"
  }
}
```

### Distribution

Executables are standalone and portable:
- ✅ No Node.js installation required
- ✅ No npm dependencies needed
- ✅ Single binary file
- ⚠️ Requires Chrome/Edge/Chromium on target system

## 🔧 How It Works

### Workflow Overview

```
1. Discovery Phase
   └─ Crawl blog page → Find article links → Filter non-articles

2. Extraction Phase
   └─ For each article:
      ├─ Load with Puppeteer
      ├─ Scroll to trigger lazy-loading
      ├─ Extract with Readability
      └─ Convert relative URLs

3. Generation Phase
   └─ Combine articles → Generate TOC → Create eBook
      ├─ PDF: Puppeteer page.pdf()
      └─ EPUB: epub-gen-memory
```

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe development |
| **Puppeteer** | Headless browser automation |
| **Mozilla Readability** | Content extraction algorithm |
| **jsdom** | DOM manipulation in Node.js |
| **Commander** | CLI argument parsing |
| **Ora** | Loading spinners |
| **epub-gen-memory** | EPUB generation |
| **pkg** | Executable packaging |
| **chrome-paths** | Browser detection |

## 🐛 Troubleshooting

### Common Issues

**1. "No articles found"**
- Check if the blog URL is correct
- Some blogs may have anti-scraping measures
- Try a different blog page with article listings

**2. "Failed to find Chrome/Edge"**
- Install Chrome, Edge, Chromium, or Brave
- The tool will fallback to bundled Chromium (slower)

**3. "PDF generation failed"**
- Ensure output directory exists
- Check disk space
- Try a smaller number of articles with `--max`

**4. "Module not found" errors**
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript

**5. "Permission denied" (Linux/macOS)**
- Make executable runnable: `chmod +x build/ebook-scape-linux`

### Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm start -- --url <URL> --out <PATH>
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ebook-scape.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make changes and test: `npm run build && npm start -- --url <TEST_URL> --out test.pdf`
6. Commit: `git commit -m "Add your feature"`
7. Push: `git push origin feature/your-feature`
8. Create a Pull Request

### QA Agent Usage (Reusable)

Use the built-in QA workflow to re-run requirement validation consistently:

1. Follow workflow: `docs/qa/TEST_WORKFLOW_REUSABLE.md`
2. Run with agent prompt:
   - `Follow docs/qa/TEST_WORKFLOW_REUSABLE.md. Run T01-T09, generate a dated test report in docs/qa, and update docs/qa/PROJECT_CONTEXT.md for future reference.`
3. Review outputs:
   - Report: `docs/qa/TEST_REPORT_YYYY-MM-DD_<slug>.md`
   - Context memory: `docs/qa/PROJECT_CONTEXT.md`
   - Artifacts: `docs/qa/artifacts/`

### Coding Standards

- Follow TypeScript best practices
- Add JSDoc comments for public APIs
- Test changes with multiple blogs
- Update documentation for new features

## 📄 License

ISC License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) - Content extraction
- [Puppeteer](https://pptr.dev/) - Browser automation
- [epub-gen-memory](https://github.com/cyrilis/epub-gen) - EPUB generation
- [Commander](https://github.com/tj/commander.js) - CLI framework

## 📊 Project Statistics

- **7 Major Features** implemented
- **11 Test Scripts** for validation
- **3 Platforms** supported (Linux, Windows, macOS)
- **2 Output Formats** (PDF & EPUB)
- **80% Performance** improvement with request interception

---

**Made with ❤️ for the developer community**

[⭐ Star this repository](https://github.com/yourusername/ebook-scape) if you find it helpful!
