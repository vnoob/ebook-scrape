import { ExtractedContent } from './extractor.js';
import puppeteer, { Browser, PDFOptions } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import EPub from 'epub-gen-memory';
import { getPuppeteerLaunchOptions } from './browser-utils.js';

// Type definition for epub-gen-memory
type EPubContent = {
  title: string;
  content: string;
};

type EPubOptions = {
  title: string;
  author: string;
  verbose?: boolean;
};

type EPubGenerator = (options: EPubOptions, content: EPubContent[]) => Promise<Buffer>;

export interface Article {
  title: string;
  contentHTML: string;
}

/**
 * Generate CSS styles for the PDF document
 * @returns CSS string
 */
function generatePDFStyles(): string {
  return `<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #333;
  max-width: 100%;
}

.toc {
  page-break-after: always;
  padding: 2rem;
}

.toc h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #1a1a1a;
  border-bottom: 3px solid #333;
  padding-bottom: 0.5rem;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-item {
  margin: 1rem 0;
  padding: 0.75rem;
  border-left: 3px solid #007bff;
  background: #f8f9fa;
}

.toc-item a {
  text-decoration: none;
  color: #007bff;
  font-size: 1.1rem;
  font-weight: 500;
  display: block;
}

.toc-item a:hover {
  color: #0056b3;
}

.toc-item-number {
  display: inline-block;
  min-width: 2rem;
  font-weight: bold;
  color: #666;
}

.chapter {
  page-break-before: always;
  padding: 2rem;
}

.chapter:first-of-type {
  page-break-before: auto;
}

.chapter h1, .chapter h2 {
  color: #1a1a1a;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.chapter h1 {
  font-size: 2rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
}

.chapter h2 {
  font-size: 1.5rem;
}

.chapter h3 {
  font-size: 1.25rem;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}

.chapter p {
  margin: 0.75rem 0;
  text-align: justify;
  line-height: 1.7;
}

.chapter p:empty {
  display: none;
}

.chapter img {
  max-width: 100%;
  height: auto;
  margin: 1.5rem auto;
  display: block;
}

.chapter pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1rem 0;
  border-left: 3px solid #007bff;
}

.chapter code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: "Courier New", monospace;
  font-size: 0.9em;
}

.chapter pre code {
  background: none;
  padding: 0;
}

.chapter blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #666;
  font-style: italic;
}

.chapter ul, .chapter ol {
  margin: 0.75rem 0;
  padding-left: 2rem;
}

.chapter li {
  margin: 0.3rem 0;
  line-height: 1.6;
}

.chapter a {
  color: #007bff;
  text-decoration: underline;
}

.chapter table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.chapter table th,
.chapter table td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
}

.chapter table th {
  background: #f5f5f5;
  font-weight: bold;
}

.chapter br + br {
  display: none;
}

.chapter div:empty,
.chapter span:empty {
  display: none;
}

@media print {
  body {
    font-size: 11pt;
  }
  
  .chapter {
    page-break-inside: avoid;
  }
  
  .chapter h1, .chapter h2, .chapter h3 {
    page-break-after: avoid;
  }
  
  .chapter img {
    page-break-inside: avoid;
  }
}
</style>`;
}

/**
 * Generate Table of Contents HTML
 * @param articles - Array of articles
 * @returns TOC HTML string
 */
function generateTableOfContents(articles: Article[]): string {
  const tocItems = articles
    .map((article, index) => {
      const chapterId = `chapter-${index}`;
      return `<li class="toc-item"><a href="#${chapterId}"><span class="toc-item-number">${index + 1}.</span> ${escapeHtml(article.title)}</a></li>`;
    })
    .join('\n');

  return `<div class="toc"><h1>Table of Contents</h1><ul class="toc-list">\n${tocItems}\n</ul></div>`;
}

/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns Escaped HTML string
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate chapter HTML for each article
 * @param articles - Array of articles
 * @returns Chapters HTML string
 */
function generateChapters(articles: Article[]): string {
  return articles
    .map((article, index) => {
      const chapterId = `chapter-${index}`;
      return `<div class="chapter" id="${chapterId}"><h1>${escapeHtml(article.title)}</h1>\n${article.contentHTML}\n</div>`;
    })
    .join('\n');
}

/**
 * Build a complete Master HTML document
 * @param articles - Array of articles
 * @returns Complete HTML string
 */
function buildMasterHTML(articles: Article[], aiCSS?: string): string {
  const styles = aiCSS ? `<style>\n${aiCSS}\n</style>` : generatePDFStyles();
  const toc = generateTableOfContents(articles);
  const chapters = generateChapters(articles);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>eBook Collection</title>
${styles}
</head>
<body>
${toc}
${chapters}
</body>
</html>`;
}

/**
 * Build a PDF from articles with Table of Contents
 * @param articles - Array of articles with title and contentHTML
 * @param outputPath - Path where the PDF should be saved
 * @returns Promise that resolves when PDF is created
 */
export async function buildPDF(
  articles: Article[],
  outputPath: string,
  aiCSS?: string
): Promise<void> {
  let browser: Browser | null = null;

  try {
    if (!articles || articles.length === 0) {
      throw new Error('No articles provided for PDF generation');
    }

    if (!outputPath) {
      throw new Error('Output path is required');
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n📄 Building PDF with ${articles.length} article(s)...`);

    const masterHTML = buildMasterHTML(articles, aiCSS);

    browser = await puppeteer.launch(await getPuppeteerLaunchOptions());

    const page = await browser.newPage();

    await page.setContent(masterHTML, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    const pdfOptions: PDFOptions = {
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      preferCSSPageSize: false
    };

    await page.pdf(pdfOptions);

    console.log(`✅ PDF generated successfully: ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to build PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Clean article content HTML for better formatting
 * @param html - Raw HTML content
 * @returns Cleaned HTML
 */
function cleanArticleContent(html: string): string {
  return html
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .trim();
}

/**
 * Build an EPUB file from articles
 * @param articles - Array of articles with title and contentHTML
 * @param outputPath - Path where the EPUB should be saved
 * @param blogTitle - Title of the eBook
 * @returns Promise that resolves when EPUB is created
 */
export async function buildEPUB(
  articles: Article[],
  outputPath: string,
  blogTitle: string
): Promise<void> {
  try {
    if (!articles || articles.length === 0) {
      throw new Error('No articles provided for EPUB generation');
    }

    if (!outputPath) {
      throw new Error('Output path is required');
    }

    if (!blogTitle) {
      throw new Error('Blog title is required');
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n📚 Building EPUB with ${articles.length} article(s)...`);

    const epubContent = articles.map((article) => ({
      title: article.title,
      content: cleanArticleContent(article.contentHTML)
    }));

    const epubBuffer = await (EPub as unknown as EPubGenerator)(
      {
        title: blogTitle,
        author: 'Auto-generated',
        verbose: false
      },
      epubContent
    );

    await fs.promises.writeFile(outputPath, epubBuffer);

    console.log(`✅ EPUB generated successfully: ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to build EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a PDF file from extracted content
 * @param content - The extracted content to convert to PDF
 * @param outputPath - The file path where the PDF should be saved
 * @returns Promise that resolves when the PDF is generated
 */
export async function generate(content: ExtractedContent, outputPath: string): Promise<void> {
  try {
    // TODO: Implement PDF generation logic
    // This is a skeleton implementation
    // You can use libraries like:
    // - puppeteer (PDF.generate from HTML)
    // - pdfkit (programmatic PDF creation)
    // - html-pdf-node
    
    console.log(`\nGenerating PDF for: ${content.title}`);
    console.log(`Output path: ${outputPath}`);
    console.log(`Content length: ${content.length} characters`);
    
    if (!content || !content.content) {
      throw new Error('No content available to generate PDF');
    }

    if (!outputPath) {
      throw new Error('Output path is required');
    }

    // Placeholder: In a real implementation, you would:
    // 1. Format the content with proper styling
    // 2. Convert HTML to PDF
    // 3. Save to the specified output path
    
    throw new Error('PDF generation not yet implemented. Please implement the generate function.');
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
