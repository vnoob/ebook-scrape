#!/usr/bin/env node

import { getArticleLinks } from './crawler.js';
import { extractContent } from './extractor.js';
import { buildPDF, buildEPUB } from './generator.js';
import * as path from 'path';

/**
 * Complete end-to-end workflow: Discover -> Extract -> Generate PDF & EPUB
 */
async function completeWorkflowBothFormats() {
  const baseUrl = process.argv[2];
  const outputDir = process.argv[3] || 'output';
  const maxArticles = parseInt(process.argv[4] || '5', 10);

  if (!baseUrl) {
    console.error('Usage: node dist/test-both-formats.js <blog-url> [output-dir] [max-articles]');
    console.error('Example: node dist/test-both-formats.js https://example.com/blog output 5');
    process.exit(1);
  }

  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log('  📚 EBOOK GENERATION WORKFLOW (PDF & EPUB)');
    console.log(`${'='.repeat(70)}\n`);

    console.log(`🔍 Step 1: Discovering articles from ${baseUrl}...`);
    const articleUrls = await getArticleLinks(baseUrl);
    console.log(`   ✅ Found ${articleUrls.length} article URLs\n`);

    if (articleUrls.length === 0) {
      console.log('No articles found. Exiting.');
      return;
    }

    const urlsToExtract = articleUrls.slice(0, maxArticles);
    console.log(`📖 Step 2: Extracting content from ${urlsToExtract.length} article(s)...`);
    console.log(`   (Processing first ${urlsToExtract.length} of ${articleUrls.length} articles)\n`);
    
    const articles = await extractContent(urlsToExtract);
    
    if (articles.length === 0) {
      console.error('No articles were successfully extracted. Exiting.');
      process.exit(1);
    }

    console.log(`   ✅ Successfully extracted ${articles.length} article(s)\n`);
    
    const blogTitle = new URL(baseUrl).hostname.replace('www.', '').split('.')[0] + ' Collection';
    
    const pdfPath = path.join(outputDir, 'ebook.pdf');
    const epubPath = path.join(outputDir, 'ebook.epub');

    console.log(`📄 Step 3a: Generating PDF...`);
    await buildPDF(articles, pdfPath);
    
    console.log(`\n📚 Step 3b: Generating EPUB...`);
    await buildEPUB(articles, epubPath, blogTitle);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('  🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log(`${'='.repeat(70)}\n`);
    console.log(`📚 eBook Statistics:`);
    console.log(`   - Total articles: ${articles.length}`);
    console.log(`   - Book title: ${blogTitle}`);
    console.log(`   - PDF output: ${pdfPath}`);
    console.log(`   - EPUB output: ${epubPath}`);
    console.log(`\n   Articles included:`);
    articles.forEach((article, index) => {
      console.log(`     ${index + 1}. ${article.title}`);
    });
    console.log(`\n✨ Your eBooks are ready!`);
    console.log(`   - Open ${pdfPath} for PDF version`);
    console.log(`   - Open ${epubPath} for EPUB version (e-readers, tablets)\n`);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`\nStack trace:`, error);
    process.exit(1);
  }
}

completeWorkflowBothFormats();
