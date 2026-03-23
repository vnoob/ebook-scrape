#!/usr/bin/env node

import { getArticleLinks } from './crawler.js';
import { extractContent } from './extractor.js';

/**
 * Complete workflow example: Discover articles and extract their content
 */
async function fullWorkflowExample() {
  const baseUrl = process.argv[2];
  
  if (!baseUrl) {
    console.error('Usage: node dist/test-full-workflow.js <blog-url>');
    console.error('Example: node dist/test-full-workflow.js https://example.com/blog');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Step 1: Discovering articles from ${baseUrl}...\n`);
    const articleUrls = await getArticleLinks(baseUrl);
    console.log(`✅ Found ${articleUrls.length} article URLs\n`);

    if (articleUrls.length === 0) {
      console.log('No articles found. Exiting.');
      return;
    }

    const urlsToExtract = articleUrls.slice(0, 3);
    console.log(`\n📖 Step 2: Extracting content from first ${urlsToExtract.length} articles...\n`);
    
    const articles = await extractContent(urlsToExtract);
    
    console.log(`\n✅ Step 3: Extraction complete!\n`);
    console.log(`Successfully extracted ${articles.length} article(s):\n`);
    
    articles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Content length: ${article.contentHTML.length} characters`);
      console.log(`   Content preview: ${article.contentHTML.substring(0, 100).replace(/\n/g, ' ')}...\n`);
    });

    console.log(`\n🎉 Workflow complete! Ready for PDF generation.`);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

fullWorkflowExample();
