#!/usr/bin/env node

import { getArticleLinks } from './crawler.js';
import { extractContent } from './extractor.js';
import { buildPDF } from './generator.js';

/**
 * Complete end-to-end workflow: Discover -> Extract -> Generate PDF
 */
async function completeWorkflow() {
  const baseUrl = process.argv[2];
  const outputPath = process.argv[3] || 'output/ebook.pdf';
  const maxArticles = parseInt(process.argv[4] || '5', 10);

  if (!baseUrl) {
    console.error('Usage: node dist/test-complete-workflow.js <blog-url> [output-path] [max-articles]');
    console.error('Example: node dist/test-complete-workflow.js https://example.com/blog output/my-ebook.pdf 5');
    process.exit(1);
  }

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('  📚 EBOOK GENERATION WORKFLOW');
    console.log(`${'='.repeat(60)}\n`);

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
    
    console.log(`📄 Step 3: Generating PDF...`);
    await buildPDF(articles, outputPath);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('  🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log(`${'='.repeat(60)}\n`);
    console.log(`📚 eBook Statistics:`);
    console.log(`   - Total articles: ${articles.length}`);
    console.log(`   - Output file: ${outputPath}`);
    console.log(`   - Articles included:`);
    articles.forEach((article, index) => {
      console.log(`     ${index + 1}. ${article.title}`);
    });
    console.log(`\n✨ Your eBook is ready! Open ${outputPath} to view it.\n`);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`\nStack trace:`, error);
    process.exit(1);
  }
}

completeWorkflow();
